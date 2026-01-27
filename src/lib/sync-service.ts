import { supabase } from './supabase'
import {
  getSyncQueue,
  removeFromSyncQueue,
  incrementSyncRetry,
  getLocalTransaction,
  saveLocalTransaction,
  deleteLocalTransaction,
  getSyncQueueCount,
  getLocalTransactions,
  saveLocalTransactions,
  setLastSyncTime,
  toLocalTransaction,
  isLocalId,
  type SyncQueueItem,
  type LocalTransaction,
} from './offline-db'
import type { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'

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
          // Max retries reached, remove from queue and mark transaction as error
          await removeFromSyncQueue(item.id)
          if (item.operation !== 'delete') {
            const localTx = await getLocalTransaction(
              item.operation === 'create' 
                ? (item.data as TransactionInsert & { id?: string }).id ?? ''
                : (item.data as TransactionUpdate).id ?? ''
            )
            if (localTx) {
              localTx.syncStatus = 'error'
              await saveLocalTransaction(localTx)
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
    const insertData = item.data as TransactionInsert & { id?: string }
    const localId = insertData.id

    // Remove local ID before inserting to server
    const { id: _, ...dataWithoutId } = insertData

    const { data: serverTransaction, error } = await supabase
      .from('transactions')
      .insert(dataWithoutId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // If we had a local ID, delete the local version and save with server ID
    if (localId && isLocalId(localId)) {
      await deleteLocalTransaction(localId)
    }

    // Save the server version
    const localTransaction = toLocalTransaction(serverTransaction as Transaction, 'synced')
    await saveLocalTransaction(localTransaction)
  }

  /**
   * Sync an update operation with last-write-wins conflict resolution
   */
  private async syncUpdate(item: SyncQueueItem): Promise<void> {
    const updateData = item.data as TransactionUpdate & { id: string }
    const { id, ...dataToUpdate } = updateData

    // First, check the server version for conflict resolution
    const { data: serverVersion, error: fetchError } = await supabase
      .from('transactions')
      .select()
      .eq('id', id)
      .single()

    if (fetchError) {
      // If not found, the transaction was deleted on server
      if (fetchError.code === 'PGRST116') {
        await deleteLocalTransaction(id)
        return
      }
      throw fetchError
    }

    // Get local version
    const localVersion = await getLocalTransaction(id)

    // Last-write-wins: compare timestamps
    if (localVersion && serverVersion) {
      const serverTx = serverVersion as Transaction
      const serverTime = new Date(serverTx.created_at).getTime()
      const localTime = new Date(localVersion.updatedAt).getTime()

      // If server is newer, accept server version (discard local changes)
      if (serverTime > localTime) {
        const updatedLocal = toLocalTransaction(serverVersion as Transaction, 'synced')
        await saveLocalTransaction(updatedLocal)
        return
      }
    }

    // Local wins, push to server
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Update local version
    const localTransaction = toLocalTransaction(updatedTransaction as Transaction, 'synced')
    await saveLocalTransaction(localTransaction)
  }

  /**
   * Sync a delete operation
   */
  private async syncDelete(item: SyncQueueItem): Promise<void> {
    const { id } = item.data as { id: string }

    // If it's a local-only transaction, just remove it locally
    if (isLocalId(id)) {
      await deleteLocalTransaction(id)
      return
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      // If not found, it's already deleted on server
      if (error.code === 'PGRST116') {
        await deleteLocalTransaction(id)
        return
      }
      throw error
    }

    // Remove from local store
    await deleteLocalTransaction(id)
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
