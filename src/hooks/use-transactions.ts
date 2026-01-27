import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/providers/store-provider'
import { useAuth } from '@/providers/auth-provider'
import {
  getLocalTransactions,
  saveLocalTransaction,
  saveLocalTransactions,
  deleteLocalTransaction,
  addToSyncQueue,
  generateLocalId,
  toLocalTransaction,
  type LocalTransaction,
} from '@/lib/offline-db'
import { syncService } from '@/lib/sync-service'
import type { Transaction, Database } from '@/types/database'
import type { TransactionType } from '@/lib/constants'

interface TransactionFilters {
  month?: string
  year?: string
  date?: string
}

interface CreateTransactionData {
  type: TransactionType
  description: string
  amount: number
  date: string
}

interface UpdateTransactionData extends CreateTransactionData {
  id: string
}

/**
 * Filter transactions based on date criteria
 */
function filterTransactions(
  transactions: LocalTransaction[],
  filters: TransactionFilters
): LocalTransaction[] {
  return transactions.filter((t) => {
    if (filters.date) {
      return t.date === filters.date
    }

    if (filters.month && filters.year) {
      const month = filters.month.padStart(2, '0')
      const monthNum = parseInt(filters.month)
      const lastDay = new Date(parseInt(filters.year), monthNum, 0).getDate()
      const startDate = `${filters.year}-${month}-01`
      const endDate = `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`
      return t.date >= startDate && t.date <= endDate
    }

    if (filters.year) {
      const startDate = `${filters.year}-01-01`
      const endDate = `${filters.year}-12-31`
      return t.date >= startDate && t.date <= endDate
    }

    if (filters.month) {
      const month = filters.month.padStart(2, '0')
      return t.date.includes(`-${month}-`)
    }

    return true
  })
}

/**
 * Sort transactions by date (descending), then created_at (descending)
 */
function sortTransactions(transactions: LocalTransaction[]): LocalTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { activeStore } = useStore()

  return useQuery({
    queryKey: ['transactions', activeStore?.id, filters],
    queryFn: async (): Promise<LocalTransaction[]> => {
      if (!activeStore) return []

      const isOnline = syncService.getIsOnline()

      // If online, fetch from server and sync to local
      if (isOnline) {
        try {
          let query = supabase
            .from('transactions')
            .select('*')
            .eq('store_id', activeStore.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

          // Apply filters for server query
          if (filters.date) {
            query = query.eq('date', filters.date)
          } else if (filters.month && filters.year) {
            const monthNum = parseInt(filters.month)
            const month = filters.month.padStart(2, '0')
            const startDate = `${filters.year}-${month}-01`
            const lastDay = new Date(parseInt(filters.year), monthNum, 0).getDate()
            const endDate = `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`
            query = query.gte('date', startDate).lte('date', endDate)
          } else if (filters.year) {
            const startDate = `${filters.year}-01-01`
            const endDate = `${filters.year}-12-31`
            query = query.gte('date', startDate).lte('date', endDate)
          } else if (filters.month) {
            const month = filters.month.padStart(2, '0')
            query = query.like('date', `%-${month}-%`)
          }

          const { data, error } = await query

          if (error) throw error

          // Convert to local transactions and save to IndexedDB
          const serverTransactions = (data as Transaction[]).map((t) =>
            toLocalTransaction(t, 'synced')
          )

          // Get local transactions to merge pending ones
          const localTransactions = await getLocalTransactions(activeStore.id)
          const serverIds = new Set(serverTransactions.map((t) => t.id))

          // Keep pending local transactions that aren't on server yet
          const pendingLocal = localTransactions.filter(
            (t) => t.syncStatus === 'pending' && !serverIds.has(t.id)
          )

          // Merge and save
          const allTransactions = [...serverTransactions, ...pendingLocal]
          await saveLocalTransactions(allTransactions)

          // Apply filters and sort for return
          const filtered = filterTransactions(allTransactions, filters)
          return sortTransactions(filtered)
        } catch (error) {
          console.error('Failed to fetch from server, falling back to local:', error)
          // Fall back to local on error
          const localTransactions = await getLocalTransactions(activeStore.id)
          const filtered = filterTransactions(localTransactions, filters)
          return sortTransactions(filtered)
        }
      }

      // Offline: read from IndexedDB
      const localTransactions = await getLocalTransactions(activeStore.id)
      const filtered = filterTransactions(localTransactions, filters)
      return sortTransactions(filtered)
    },
    enabled: !!activeStore,
  })
}

export function useTransactionTotals(filters: TransactionFilters = {}) {
  const { data: transactions = [], isLoading } = useTransactions(filters)
  const { activeStore } = useStore()

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'work') {
        acc.income += t.amount
      } else {
        acc.expense += t.amount
      }
      return acc
    },
    { income: 0, expense: 0 }
  )

  return {
    income: totals.income,
    expense: totals.expense,
    balance: totals.income - totals.expense,
    currency: activeStore?.currency ?? 'Rs',
    isLoading,
  }
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!activeStore || !user) throw new Error('No active store or user')

      const isOnline = syncService.getIsOnline()
      const now = new Date().toISOString()

      const insertData: Database['public']['Tables']['transactions']['Insert'] = {
        store_id: activeStore.id,
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
        created_by: user.id,
      }

      if (isOnline) {
        // Online: insert directly to server
        const { data: transaction, error } = await supabase
          .from('transactions')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error

        // Save to local storage
        const localTransaction = toLocalTransaction(transaction as Transaction, 'synced')
        await saveLocalTransaction(localTransaction)

        return transaction
      }

      // Offline: save locally with temporary ID
      const localId = generateLocalId()
      const localTransaction: LocalTransaction = {
        id: localId,
        store_id: activeStore.id,
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
        created_at: now,
        created_by: user.id,
        syncStatus: 'pending',
        localId,
        updatedAt: now,
      }

      await saveLocalTransaction(localTransaction)

      // Add to sync queue
      await addToSyncQueue({
        operation: 'create',
        table: 'transactions',
        data: { ...insertData, id: localId },
        storeId: activeStore.id,
      })

      return localTransaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
      queryClient.invalidateQueries({ queryKey: ['transaction-years', activeStore?.id] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      if (!activeStore) throw new Error('No active store')

      const isOnline = syncService.getIsOnline()
      const now = new Date().toISOString()

      const updateData: Database['public']['Tables']['transactions']['Update'] = {
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
      }

      if (isOnline) {
        // Online: update directly on server
        const { data: transaction, error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', data.id)
          .select()
          .single()

        if (error) throw error

        // Update local storage
        const localTransaction = toLocalTransaction(transaction as Transaction, 'synced')
        await saveLocalTransaction(localTransaction)

        return transaction
      }

      // Offline: update locally
      const existingLocal = await getLocalTransactions(activeStore.id)
      const existing = existingLocal.find((t) => t.id === data.id)

      if (!existing) {
        throw new Error('Transaction not found')
      }

      const updatedTransaction: LocalTransaction = {
        ...existing,
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
        syncStatus: 'pending',
        updatedAt: now,
      }

      await saveLocalTransaction(updatedTransaction)

      // Add to sync queue
      await addToSyncQueue({
        operation: 'update',
        table: 'transactions',
        data: { ...updateData, id: data.id },
        storeId: activeStore.id,
      })

      return updatedTransaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
      queryClient.invalidateQueries({ queryKey: ['transaction-years', activeStore?.id] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeStore) throw new Error('No active store')

      const isOnline = syncService.getIsOnline()

      if (isOnline) {
        // Online: delete from server
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) throw error

        // Delete from local storage
        await deleteLocalTransaction(id)
        return
      }

      // Offline: mark for deletion
      await deleteLocalTransaction(id)

      // Add to sync queue (unless it's a local-only transaction)
      if (!id.startsWith('local_')) {
        await addToSyncQueue({
          operation: 'delete',
          table: 'transactions',
          data: { id },
          storeId: activeStore.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
      queryClient.invalidateQueries({ queryKey: ['transaction-years', activeStore?.id] })
    },
  })
}

export function useAvailableYears() {
  const { activeStore } = useStore()

  return useQuery({
    queryKey: ['transaction-years', activeStore?.id],
    queryFn: async () => {
      if (!activeStore) return []

      const isOnline = syncService.getIsOnline()

      if (isOnline) {
        try {
          const { data, error } = await supabase
            .from('transactions')
            .select('date')
            .eq('store_id', activeStore.id)

          if (error) throw error

          const years = new Set(
            (data as { date: string }[]).map((t) => new Date(t.date).getFullYear().toString())
          )
          return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))
        } catch (error) {
          console.error('Failed to fetch years from server:', error)
          // Fall back to local
        }
      }

      // Get from local storage
      const localTransactions = await getLocalTransactions(activeStore.id)
      const years = new Set(
        localTransactions.map((t) => new Date(t.date).getFullYear().toString())
      )
      return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))
    },
    enabled: !!activeStore,
  })
}

/**
 * Hook to sync transactions from server to local when coming online
 */
export function useSyncTransactions() {
  const { activeStore } = useStore()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const syncFromServer = async () => {
    if (!activeStore || !user) return

    await syncService.syncFromServer(activeStore.id, user.id)
    queryClient.invalidateQueries({ queryKey: ['transactions', activeStore.id] })
  }

  return { syncFromServer }
}
