import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Transaction, TransactionInsert, TransactionUpdate } from '@/types/database'

/**
 * Sync queue item representing a pending operation to sync with the server
 */
export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  table: 'transactions'
  data: TransactionInsert | TransactionUpdate | { id: string }
  storeId: string
  createdAt: string
  retryCount: number
}

/**
 * Local transaction with sync status
 */
export interface LocalTransaction extends Transaction {
  syncStatus: 'synced' | 'pending' | 'error'
  localId?: string // Temporary ID for offline-created transactions
  updatedAt: string
}

/**
 * Metadata for sync state
 */
export interface SyncMetadata {
  key: string
  value: string | number | boolean
}

/**
 * IndexedDB schema for offline storage
 */
interface OfflineDBSchema extends DBSchema {
  transactions: {
    key: string
    value: LocalTransaction
    indexes: {
      'by-store': string
      'by-date': string
      'by-sync-status': string
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-store': string
      'by-created-at': string
    }
  }
  metadata: {
    key: string
    value: SyncMetadata
  }
}

const DB_NAME = 'expense-tracker-offline'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null

/**
 * Initialize and return the IndexedDB database instance
 */
export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' })
        transactionStore.createIndex('by-store', 'store_id')
        transactionStore.createIndex('by-date', 'date')
        transactionStore.createIndex('by-sync-status', 'syncStatus')
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncQueueStore.createIndex('by-store', 'storeId')
        syncQueueStore.createIndex('by-created-at', 'createdAt')
      }

      // Create metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

// =====================
// Transaction Operations
// =====================

/**
 * Get all transactions for a store
 */
export async function getLocalTransactions(storeId: string): Promise<LocalTransaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-store', storeId)
}

/**
 * Get a single transaction by ID
 */
export async function getLocalTransaction(id: string): Promise<LocalTransaction | undefined> {
  const db = await getDB()
  return db.get('transactions', id)
}

/**
 * Save a transaction locally (create or update)
 */
export async function saveLocalTransaction(transaction: LocalTransaction): Promise<void> {
  const db = await getDB()
  await db.put('transactions', transaction)
}

/**
 * Save multiple transactions locally (for bulk sync)
 */
export async function saveLocalTransactions(transactions: LocalTransaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  await Promise.all([
    ...transactions.map((t) => tx.store.put(t)),
    tx.done,
  ])
}

/**
 * Delete a transaction locally
 */
export async function deleteLocalTransaction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('transactions', id)
}

/**
 * Get all pending (unsynced) transactions
 */
export async function getPendingTransactions(): Promise<LocalTransaction[]> {
  const db = await getDB()
  return db.getAllFromIndex('transactions', 'by-sync-status', 'pending')
}

/**
 * Clear all transactions for a store (used before full sync)
 */
export async function clearStoreTransactions(storeId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('transactions', 'readwrite')
  const index = tx.store.index('by-store')
  let cursor = await index.openCursor(storeId)
  
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  
  await tx.done
}

// =====================
// Sync Queue Operations
// =====================

/**
 * Add an operation to the sync queue
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const queueItem: SyncQueueItem = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  }
  await db.add('syncQueue', queueItem)
  return id
}

/**
 * Get all items in the sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('syncQueue', 'by-created-at')
}

/**
 * Get sync queue items for a specific store
 */
export async function getStoreSyncQueue(storeId: string): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('syncQueue', 'by-store', storeId)
}

/**
 * Get the count of pending sync items
 */
export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('syncQueue')
}

/**
 * Remove an item from the sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

/**
 * Update retry count for a sync queue item
 */
export async function incrementSyncRetry(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('syncQueue', id)
  if (item) {
    item.retryCount += 1
    await db.put('syncQueue', item)
  }
}

/**
 * Clear all items from the sync queue
 */
export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('syncQueue')
}

// =====================
// Metadata Operations
// =====================

/**
 * Get a metadata value
 */
export async function getMetadata(key: string): Promise<string | number | boolean | undefined> {
  const db = await getDB()
  const item = await db.get('metadata', key)
  return item?.value
}

/**
 * Set a metadata value
 */
export async function setMetadata(key: string, value: string | number | boolean): Promise<void> {
  const db = await getDB()
  await db.put('metadata', { key, value })
}

/**
 * Get the last sync timestamp for a store
 */
export async function getLastSyncTime(storeId: string): Promise<Date | null> {
  const timestamp = await getMetadata(`lastSync_${storeId}`)
  return timestamp ? new Date(timestamp as string) : null
}

/**
 * Set the last sync timestamp for a store
 */
export async function setLastSyncTime(storeId: string, date: Date): Promise<void> {
  await setMetadata(`lastSync_${storeId}`, date.toISOString())
}

// =====================
// Utility Functions
// =====================

/**
 * Generate a temporary local ID for offline-created transactions
 */
export function generateLocalId(): string {
  return `local_${crypto.randomUUID()}`
}

/**
 * Check if an ID is a local (temporary) ID
 */
export function isLocalId(id: string): boolean {
  return id.startsWith('local_')
}

/**
 * Convert a server transaction to a local transaction
 */
export function toLocalTransaction(
  transaction: Transaction,
  syncStatus: 'synced' | 'pending' | 'error' = 'synced'
): LocalTransaction {
  return {
    ...transaction,
    syncStatus,
    updatedAt: transaction.created_at,
  }
}

/**
 * Clear all offline data (for logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('transactions'),
    db.clear('syncQueue'),
    db.clear('metadata'),
  ])
}
