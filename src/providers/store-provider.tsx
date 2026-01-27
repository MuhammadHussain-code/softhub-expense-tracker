import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-provider'
import { STORAGE_KEYS } from '@/lib/constants'
import type { Store } from '@/types/database'

interface StoreContextType {
  stores: Store[]
  activeStore: Store | null
  setActiveStore: (store: Store) => void
  isLoading: boolean
  refetchStores: () => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

interface StoreProviderProps {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeStore, setActiveStoreState] = useState<Store | null>(null)

  // Fetch user's stores
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as Store[]
    },
    enabled: !!user,
  })

  // Initialize or validate active store from localStorage
  useEffect(() => {
    if (isLoading || stores.length === 0) {
      setActiveStoreState(null)
      return
    }

    const savedStoreId = localStorage.getItem(STORAGE_KEYS.activeStoreId)
    const savedStore = stores.find((s) => s.id === savedStoreId)

    if (savedStore) {
      setActiveStoreState(savedStore)
    } else {
      // Default to first store
      const firstStore = stores[0]
      if (firstStore) {
        setActiveStoreState(firstStore)
        localStorage.setItem(STORAGE_KEYS.activeStoreId, firstStore.id)
      }
    }
  }, [stores, isLoading])

  const setActiveStore = (store: Store) => {
    setActiveStoreState(store)
    localStorage.setItem(STORAGE_KEYS.activeStoreId, store.id)
  }

  const refetchStores = () => {
    queryClient.invalidateQueries({ queryKey: ['stores', user?.id] })
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        activeStore,
        setActiveStore,
        isLoading,
        refetchStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
