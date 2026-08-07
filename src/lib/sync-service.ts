import { supabase } from './supabase'
import {
  getSyncQueue,
  removeFromSyncQueue,
  incrementSyncRetry,
  getLocalTransaction,
  saveLocalTransaction,
  deleteLocalTransaction,
  getLocalCustomer,
  saveLocalCustomer,
  deleteLocalCustomer,
  getLocalPhoto,
  deleteLocalPhoto,
  markPhotoUploaded,
  getSyncQueueCount,
  getLocalTransactions,
  saveLocalTransactions,
  setLastSyncTime,
  toLocalTransaction,
  toLocalCustomer,
  isLocalId,
  type SyncQueueItem,
  type SyncTable,
  type LocalTransaction,
  type LocalCustomer,
} from './offline-db'
import {
  uploadCustomerPhoto,
  deleteCustomerPhoto,
  customerPhotoPath,
} from './customer-photos'
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  Customer,
  CustomerInsert,
  CustomerUpdate,
} from '@/types/database'

/**
 * A row as it exists on the server, for any synced table
 */
type ServerRow = Transaction | Customer

/**
 * A row as it exists in IndexedDB, for any synced table
 */
type LocalRecord = LocalTransaction | LocalCustomer

/**
 * Loosely typed write payload pulled off a queue item
 */
type WritePayload = Record<string, unknown>

type SyncStatus = 'synced' | 'pending' | 'error'

/**
 * Everything the sync loop needs to know about one table. Keeping the Supabase
 * calls inside each adapter means every query still uses a literal table name
 * and stays fully typed.
 */
interface SyncTableAdapter {
  getLocal(id: string): Promise<LocalRecord | undefined>
  saveLocal(record: LocalRecord): Promise<void>
  deleteLocal(id: string): Promise<void>
  toLocal(row: ServerRow, status: SyncStatus): LocalRecord
  fetchServer(id: string): Promise<{ data: ServerRow | null; error: { code?: string } | null }>
  insertServer(data: WritePayload): Promise<{ data: ServerRow | null; error: unknown }>
  updateServer(
    id: string,
    data: WritePayload
  ): Promise<{ data: ServerRow | null; error: unknown }>
  deleteServer(id: string): Promise<{ error: { code?: string } | null }>
  /** Runs before an insert/update reaches the server (e.g. photo upload) */
  prepareWrite?(data: WritePayload, storeId: string): Promise<WritePayload>
  /** Runs after a row is removed, locally or on the server */
  onDeleted?(id: string, storeId: string): Promise<void>
}

const adapters: Record<SyncTable, SyncTableAdapter> = {
  transactions: {
    getLocal: getLocalTransaction,
    saveLocal: (record) => saveLocalTransaction(record as LocalTransaction),
    deleteLocal: deleteLocalTransaction,
    toLocal: (row, status) => toLocalTransaction(row as Transaction, status),
    fetchServer: async (id) => {
      const { data, error } = await supabase
        .from('transactions')
        .select()
        .eq('id', id)
        .single()
      return { data: data as Transaction | null, error }
    },
    insertServer: async (data) => {
      const { data: row, error } = await supabase
        .from('transactions')
        .insert(data as TransactionInsert)
        .select()
        .single()
      return { data: row as Transaction | null, error }
    },
    updateServer: async (id, data) => {
      const { data: row, error } = await supabase
        .from('transactions')
        .update(data as TransactionUpdate)
        .eq('id', id)
        .select()
        .single()
      return { data: row as Transaction | null, error }
    },
    deleteServer: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      return { error }
    },
  },
  customers: {
    getLocal: getLocalCustomer,
    saveLocal: (record) => saveLocalCustomer(record as LocalCustomer),
    deleteLocal: deleteLocalCustomer,
    toLocal: (row, status) => toLocalCustomer(row as Customer, status),
    fetchServer: async (id) => {
      const { data, error } = await supabase
        .from('customers')
        .select()
        .eq('id', id)
        .single()
      return { data: data as Customer | null, error }
    },
    insertServer: async (data) => {
      const { data: row, error } = await supabase
        .from('customers')
        .insert(data as CustomerInsert)
        .select()
        .single()
      return { data: row as Customer | null, error }
    },
    updateServer: async (id, data) => {
      const { data: row, error } = await supabase
        .from('customers')
        .update(data as CustomerUpdate)
        .eq('id', id)
        .select()
        .single()
      return { data: row as Customer | null, error }
    },
    deleteServer: async (id) => {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      return { error }
    },
    // A customer photo taken offline lives in IndexedDB until this runs
    prepareWrite: async (data, storeId) => {
      const id = data.id as string | undefined
      if (!id) return data

      const photo = await getLocalPhoto(id)
      if (!photo || photo.uploaded) return data

      const path = await uploadCustomerPhoto(storeId, id, photo.blob)
      await markPhotoUploaded(id)

      return { ...data, photo_path: path }
    },
    onDeleted: async (id, storeId) => {
      await deleteCustomerPhoto(customerPhotoPath(storeId, id))
      await deleteLocalPhoto(id)
    },
  },
}

/**
 * Event types emitted by the sync service
 */
export type SyncEventType = 
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'sync-progress'
  | 'online'
  | 'offline'
  | 'queue-updated'

export interface SyncEvent {
  type: SyncEventType
  data?: {
    total?: number
    completed?: number
    failed?: number
    error?: Error
  }
}

type SyncEventListener = (event: SyncEvent) => void

/**
 * Maximum retry attempts for failed sync operations
 */
const MAX_RETRY_COUNT = 5

/**
 * Singleton sync service class
 */
class SyncService {
  private listeners: Set<SyncEventListener> = new Set()
  private isSyncing = false
  private isOnline = navigator.onLine

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  /**
   * Add an event listener
   */
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listener: SyncEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }

  /**
   * Handle coming online
   */
  private handleOnline = (): void => {
    this.isOnline = true
    this.emit({ type: 'online' })
    // Automatically start sync when coming online
    this.sync()
  }

  /**
   * Handle going offline
   */
  private handleOffline = (): void => {
    this.isOnline = false
    this.emit({ type: 'offline' })
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return getSyncQueueCount()
  }

  /**
   * Process the sync queue
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return
    }

    this.isSyncing = true
    this.emit({ type: 'sync-started' })

    const queue = await getSyncQueue()
    
    if (queue.length === 0) {
      this.isSyncing = false
      this.emit({ type: 'sync-completed', data: { total: 0, completed: 0, failed: 0 } })
      return
    }

    let completed = 0
    let failed = 0

    for (const item of queue) {
      try {
        await this.processQueueItem(item)
        await removeFromSyncQueue(item.id)
        completed++
        this.emit({ 
          type: 'sync-progress', 
          data: { total: queue.length, completed, failed } 
        })
      } catch (error) {
        console.error('Sync item failed:', error)
        
        if (item.retryCount >= MAX_RETRY_COUNT) {
          // Max retries reached, remove from queue and mark the row as error
          await removeFromSyncQueue(item.id)
          if (item.operation !== 'delete') {
            const adapter = adapters[item.table]
            const rowId = (item.data as WritePayload).id as string | undefined
            const localRow = rowId ? await adapter.getLocal(rowId) : undefined
            if (localRow) {
              localRow.syncStatus = 'error'
              await adapter.saveLocal(localRow)
            }
          }
          failed++
        } else {
          await incrementSyncRetry(item.id)
          failed++
        }
      }
    }

    this.isSyncing = false
    this.emit({ 
      type: 'sync-completed', 
      data: { total: queue.length, completed, failed } 
    })
    this.emit({ type: 'queue-updated' })
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.syncCreate(item)
        break
      case 'update':
        await this.syncUpdate(item)
        break
      case 'delete':
        await this.syncDelete(item)
        break
    }
  }

  /**
   * Sync a create operation
   */
  private async syncCreate(item: SyncQueueItem): Promise<void> {
    const adapter = adapters[item.table]
    const insertData = { ...(item.data as WritePayload) }
    const queuedId = insertData.id as string | undefined

    const payload = adapter.prepareWrite
      ? await adapter.prepareWrite(insertData, item.storeId)
      : insertData

    // Temporary local IDs never reach the server; client-generated UUIDs do
    if (queuedId && isLocalId(queuedId)) {
      delete payload.id
    }

    const { data: serverRow, error } = await adapter.insertServer(payload)

    if (error) {
      throw error
    }

    // If we had a local ID, delete the local version and save with server ID
    if (queuedId && isLocalId(queuedId)) {
      await adapter.deleteLocal(queuedId)
    }

    // Save the server version
    if (serverRow) {
      await adapter.saveLocal(adapter.toLocal(serverRow, 'synced'))
    }
  }

  /**
   * Sync an update operation with last-write-wins conflict resolution
   */
  private async syncUpdate(item: SyncQueueItem): Promise<void> {
    const adapter = adapters[item.table]
    const updateData = { ...(item.data as WritePayload) } as WritePayload & { id: string }
    const { id } = updateData

    // First, check the server version for conflict resolution
    const { data: serverVersion, error: fetchError } = await adapter.fetchServer(id)

    if (fetchError) {
      // If not found, the row was deleted on server
      if (fetchError.code === 'PGRST116') {
        await adapter.deleteLocal(id)
        return
      }
      throw fetchError
    }

    // Get local version
    const localVersion = await adapter.getLocal(id)

    // Last-write-wins: compare timestamps
    if (localVersion && serverVersion) {
      const serverTime = new Date(serverVersion.created_at).getTime()
      const localTime = new Date(localVersion.updatedAt).getTime()

      // If server is newer, accept server version (discard local changes)
      if (serverTime > localTime) {
        await adapter.saveLocal(adapter.toLocal(serverVersion, 'synced'))
        return
      }
    }

    const prepared = adapter.prepareWrite
      ? await adapter.prepareWrite(updateData, item.storeId)
      : updateData

    const dataToUpdate = { ...prepared }
    delete dataToUpdate.id

    // Local wins, push to server
    const { data: updatedRow, error: updateError } = await adapter.updateServer(
      id,
      dataToUpdate
    )

    if (updateError) {
      throw updateError
    }

    // Update local version
    if (updatedRow) {
      await adapter.saveLocal(adapter.toLocal(updatedRow, 'synced'))
    }
  }

  /**
   * Sync a delete operation
   */
  private async syncDelete(item: SyncQueueItem): Promise<void> {
    const adapter = adapters[item.table]
    const { id } = item.data as { id: string }

    // If it's a local-only row, just remove it locally
    if (isLocalId(id)) {
      await adapter.deleteLocal(id)
      await adapter.onDeleted?.(id, item.storeId)
      return
    }

    const { error } = await adapter.deleteServer(id)

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means it is already gone on the server
      throw error
    }

    // Remove from local store
    await adapter.deleteLocal(id)
    await adapter.onDeleted?.(id, item.storeId)
  }

  /**
   * Fetch all transactions from server and merge with local
   * This is used for initial sync when coming online
   */
  async syncFromServer(storeId: string, _userId: string): Promise<void> {
    if (!this.isOnline) {
      return
    }

    const { data: serverTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Failed to fetch transactions from server:', error)
      return
    }

    // Get local transactions
    const localTransactions = await getLocalTransactions(storeId)
    const localMap = new Map(localTransactions.map((t) => [t.id, t]))

    // Merge server transactions with local
    const mergedTransactions: LocalTransaction[] = []

    for (const serverTx of serverTransactions as Transaction[]) {
      const localTx = localMap.get(serverTx.id)
      
      if (localTx) {
        // If local has pending changes, keep local version
        if (localTx.syncStatus === 'pending') {
          mergedTransactions.push(localTx)
        } else {
          // Use server version
          mergedTransactions.push(toLocalTransaction(serverTx, 'synced'))
        }
        localMap.delete(serverTx.id)
      } else {
        // New from server
        mergedTransactions.push(toLocalTransaction(serverTx, 'synced'))
      }
    }

    // Keep local-only transactions (with local IDs) that haven't been synced yet
    for (const localTx of localMap.values()) {
      if (localTx.syncStatus === 'pending' || isLocalId(localTx.id)) {
        mergedTransactions.push(localTx)
      }
    }

    // Save merged transactions
    await saveLocalTransactions(mergedTransactions)
    await setLastSyncTime(storeId, new Date())
  }

  /**
   * Cleanup on logout
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }
}

// Singleton instance
export const syncService = new SyncService()
