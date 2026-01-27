import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { syncService, type SyncEvent } from '@/lib/sync-service'
import { getSyncQueueCount } from '@/lib/offline-db'

interface NetworkContextType {
  /** Whether the device is currently online */
  isOnline: boolean
  /** Whether a sync operation is in progress */
  isSyncing: boolean
  /** Number of items waiting to be synced */
  pendingCount: number
  /** Last successful sync timestamp */
  lastSyncedAt: Date | null
  /** Manually trigger a sync */
  syncNow: () => Promise<void>
  /** Refresh the pending count */
  refreshPendingCount: () => Promise<void>
}

const NetworkContext = createContext<NetworkContextType | null>(null)

interface NetworkProviderProps {
  children: ReactNode
}

/**
 * Provider component that manages network state and sync operations
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  /**
   * Refresh the pending sync count
   */
  const refreshPendingCount = useCallback(async () => {
    const count = await getSyncQueueCount()
    setPendingCount(count)
  }, [])

  /**
   * Manually trigger a sync
   */
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return
    await syncService.sync()
  }, [isOnline, isSyncing])

  /**
   * Handle sync service events
   */
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true)
          break
        case 'offline':
          setIsOnline(false)
          break
        case 'sync-started':
          setIsSyncing(true)
          break
        case 'sync-completed':
          setIsSyncing(false)
          setLastSyncedAt(new Date())
          refreshPendingCount()
          break
        case 'sync-failed':
          setIsSyncing(false)
          refreshPendingCount()
          break
        case 'queue-updated':
          refreshPendingCount()
          break
      }
    }

    // Subscribe to sync service events
    const unsubscribe = syncService.addEventListener(handleSyncEvent)

    // Initialize state
    setIsOnline(syncService.getIsOnline())
    setIsSyncing(syncService.getIsSyncing())
    refreshPendingCount()

    return () => {
      unsubscribe()
    }
  }, [refreshPendingCount])

  const value: NetworkContextType = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    syncNow,
    refreshPendingCount,
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}

/**
 * Hook to access network state and sync operations
 */
export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}
