import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/providers/store-provider'
import { useAuth } from '@/providers/auth-provider'
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

export function useTransactions(filters: TransactionFilters = {}) {
  const { activeStore } = useStore()

  return useQuery({
    queryKey: ['transactions', activeStore?.id, filters],
    queryFn: async () => {
      if (!activeStore) return []

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('store_id', activeStore.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.date) {
        query = query.eq('date', filters.date)
      } else if (filters.month && filters.year) {
        // Both month and year selected - filter by specific month
        const monthNum = parseInt(filters.month)
        const month = filters.month.padStart(2, '0')
        const startDate = `${filters.year}-${month}-01`
        // Get last day of the month: use next month's day 0
        // JavaScript Date months are 0-indexed, so monthNum (1-12) is already "next month" in 0-indexed terms
        const lastDay = new Date(
          parseInt(filters.year),
          monthNum,
          0
        ).getDate()
        const endDate = `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`
        query = query.gte('date', startDate).lte('date', endDate)
      } else if (filters.year) {
        // Only year selected - filter by entire year
        const startDate = `${filters.year}-01-01`
        const endDate = `${filters.year}-12-31`
        query = query.gte('date', startDate).lte('date', endDate)
      } else if (filters.month) {
        // Only month selected - filter by that month across all years
        const month = filters.month.padStart(2, '0')
        // Use LIKE pattern to match any year with this month
        query = query.like('date', `%-${month}-%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Transaction[]
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

      const insertData: Database['public']['Tables']['transactions']['Insert'] = {
        store_id: activeStore.id,
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
        created_by: user.id,
      }

      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return transaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      const updateData: Database['public']['Tables']['transactions']['Update'] = {
        type: data.type,
        description: data.description,
        amount: data.amount,
        date: data.date,
      }

      const { data: transaction, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single()

      if (error) throw error
      return transaction
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', activeStore?.id] })
    },
  })
}

export function useAvailableYears() {
  const { activeStore } = useStore()

  return useQuery({
    queryKey: ['transaction-years', activeStore?.id],
    queryFn: async () => {
      if (!activeStore) return []

      const { data, error } = await supabase
        .from('transactions')
        .select('date')
        .eq('store_id', activeStore.id)

      if (error) throw error

      const years = new Set(
        (data as { date: string }[]).map((t) => new Date(t.date).getFullYear().toString())
      )
      return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))
    },
    enabled: !!activeStore,
  })
}
