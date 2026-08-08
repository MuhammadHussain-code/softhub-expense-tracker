import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/providers/store-provider'
import { useAuth } from '@/providers/auth-provider'
import {
  getLocalCustomers,
  getLocalCustomer,
  saveLocalCustomer,
  saveLocalCustomers,
  deleteLocalCustomer,
  saveLocalPhoto,
  getLocalPhoto,
  deleteLocalPhoto,
  markPhotoUploaded,
  addToSyncQueue,
  toLocalCustomer,
  PHOTO_SLOTS,
  type LocalCustomer,
  type PhotoSlot,
} from '@/lib/offline-db'
import {
  uploadCustomerPhoto,
  deleteCustomerPhoto,
  getCustomerPhotoUrl,
  customerPhotoPath,
} from '@/lib/customer-photos'
import { syncService } from '@/lib/sync-service'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerStatus } from '@/types/database'

/**
 * `undefined` leaves the existing photo alone, `null` removes it,
 * a Blob replaces it.
 */
export type PhotoChange = Blob | null | undefined

/** One entry per photo slot: front and back of the device */
export type PhotoChanges = Partial<Record<PhotoSlot, PhotoChange>>

/** Column on `customers` that stores the path for a given slot */
const PHOTO_PATH_COLUMN: Record<PhotoSlot, 'photo_path' | 'photo_back_path'> = {
  front: 'photo_path',
  back: 'photo_back_path',
}

export interface CustomerFields {
  work_name: string
  customer_name: string
  imei: string
  imei2: string
  model: string
  phone: string
  cnic: string
  address: string
  notes: string
  status: CustomerStatus
  date: string
}

export interface CreateCustomerData extends CustomerFields {
  photos?: PhotoChanges
}

export interface UpdateCustomerData extends CustomerFields {
  id: string
  photos?: PhotoChanges
}

/**
 * Match a customer against the search box: name, model, phone, either IMEI,
 * or CNIC.
 */
function matchesSearch(customer: LocalCustomer, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [
    customer.customer_name,
    customer.model,
    customer.phone,
    customer.imei,
    customer.imei2,
    customer.cnic,
  ].some((field) => (field ?? '').toLowerCase().includes(needle))
}

/**
 * Sort customers by date (descending), then created_at (descending)
 */
function sortCustomers(customers: LocalCustomer[]): LocalCustomer[] {
  return [...customers].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })
}

export function useCustomers(search: string = '') {
  const { activeStore } = useStore()

  return useQuery({
    queryKey: ['customers', activeStore?.id, search],
    queryFn: async (): Promise<LocalCustomer[]> => {
      if (!activeStore) return []

      if (syncService.getIsOnline()) {
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('store_id', activeStore.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

          if (error) throw error

          const serverCustomers = (data as Customer[]).map((c) => toLocalCustomer(c, 'synced'))

          // Keep local rows that have not reached the server yet
          const localCustomers = await getLocalCustomers(activeStore.id)
          const serverIds = new Set(serverCustomers.map((c) => c.id))
          const pendingLocal = localCustomers.filter(
            (c) => c.syncStatus === 'pending' && !serverIds.has(c.id)
          )

          const all = [...serverCustomers, ...pendingLocal]
          await saveLocalCustomers(all)

          return sortCustomers(all.filter((c) => matchesSearch(c, search)))
        } catch (error) {
          console.error('Failed to fetch customers, falling back to local:', error)
        }
      }

      const localCustomers = await getLocalCustomers(activeStore.id)
      return sortCustomers(localCustomers.filter((c) => matchesSearch(c, search)))
    },
    enabled: !!activeStore,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      if (!activeStore || !user) throw new Error('No active store or user')

      const isOnline = syncService.getIsOnline()
      const now = new Date().toISOString()
      // IDs are generated here (not by the server) so the photo's storage path
      // is known before the row exists, online or offline
      const id = crypto.randomUUID()
      const { photos = {}, ...fields } = data

      const insertData: CustomerInsert = {
        id,
        store_id: activeStore.id,
        ...fields,
        photo_path: null,
        photo_back_path: null,
        created_by: user.id,
      }

      // Keep every picked photo on the device first, so nothing is lost if the
      // upload or the insert fails
      for (const slot of PHOTO_SLOTS) {
        const photo = photos[slot]
        if (!photo) continue
        await saveLocalPhoto({
          customerId: id,
          storeId: activeStore.id,
          blob: photo,
          uploaded: false,
          slot,
        })
      }

      if (isOnline) {
        let hasPendingUpload = false

        for (const slot of PHOTO_SLOTS) {
          const photo = photos[slot]
          if (!photo) continue
          try {
            insertData[PHOTO_PATH_COLUMN[slot]] = await uploadCustomerPhoto(
              activeStore.id,
              id,
              photo,
              slot
            )
            await markPhotoUploaded(id, slot)
          } catch (error) {
            // Saving the customer matters more than the photo; sync retries it
            console.error('Photo upload failed, will retry on next sync:', error)
            hasPendingUpload = true
          }
        }

        const { data: customer, error } = await supabase
          .from('customers')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error

        await saveLocalCustomer(toLocalCustomer(customer as Customer, 'synced'))

        if (hasPendingUpload) {
          await addToSyncQueue({
            operation: 'update',
            table: 'customers',
            data: { id },
            storeId: activeStore.id,
          })
        }

        return customer
      }

      const localCustomer: LocalCustomer = {
        id,
        store_id: activeStore.id,
        ...fields,
        photo_path: null,
        photo_back_path: null,
        created_at: now,
        created_by: user.id,
        syncStatus: 'pending',
        updatedAt: now,
      }

      await saveLocalCustomer(localCustomer)
      await addToSyncQueue({
        operation: 'create',
        table: 'customers',
        data: insertData,
        storeId: activeStore.id,
      })

      return localCustomer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (data: UpdateCustomerData) => {
      if (!activeStore) throw new Error('No active store')

      const isOnline = syncService.getIsOnline()
      const now = new Date().toISOString()
      const { id, photos = {}, ...fields } = data

      const existing = await getLocalCustomer(id)
      const updateData: CustomerUpdate = { ...fields }
      let photoPendingUpload = false

      for (const slot of PHOTO_SLOTS) {
        const photo = photos[slot]
        if (photo === undefined) continue // slot untouched

        const column = PHOTO_PATH_COLUMN[slot]

        if (photo === null) {
          // Removing this photo
          await deleteLocalPhoto(id, slot)
          updateData[column] = null
          const existingPath = existing?.[column]
          if (isOnline && existingPath) {
            await deleteCustomerPhoto(existingPath)
          }
          continue
        }

        await saveLocalPhoto({
          customerId: id,
          storeId: activeStore.id,
          blob: photo,
          uploaded: false,
          slot,
        })

        if (isOnline) {
          try {
            updateData[column] = await uploadCustomerPhoto(activeStore.id, id, photo, slot)
            await markPhotoUploaded(id, slot)
          } catch (error) {
            console.error('Photo upload failed, will retry on next sync:', error)
            photoPendingUpload = true
          }
        }
        // Offline: the queued update below carries the upload
      }

      if (isOnline) {
        const { data: customer, error } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        await saveLocalCustomer(toLocalCustomer(customer as Customer, 'synced'))

        if (photoPendingUpload) {
          await addToSyncQueue({
            operation: 'update',
            table: 'customers',
            data: { id },
            storeId: activeStore.id,
          })
        }

        return customer
      }

      if (!existing) {
        throw new Error('Customer not found')
      }

      const updatedCustomer: LocalCustomer = {
        ...existing,
        ...fields,
        photo_path:
          updateData.photo_path === undefined ? existing.photo_path : updateData.photo_path,
        photo_back_path:
          updateData.photo_back_path === undefined
            ? existing.photo_back_path
            : updateData.photo_back_path,
        syncStatus: 'pending',
        updatedAt: now,
      }

      await saveLocalCustomer(updatedCustomer)
      await addToSyncQueue({
        operation: 'update',
        table: 'customers',
        data: { ...updateData, id },
        storeId: activeStore.id,
      })

      return updatedCustomer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { activeStore } = useStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeStore) throw new Error('No active store')

      const isOnline = syncService.getIsOnline()

      if (isOnline) {
        const { error } = await supabase.from('customers').delete().eq('id', id)
        if (error) throw error

        for (const slot of PHOTO_SLOTS) {
          await deleteCustomerPhoto(customerPhotoPath(activeStore.id, id, slot))
        }
        await deleteLocalCustomer(id)
        await deleteLocalPhoto(id)
        return
      }

      await deleteLocalCustomer(id)
      await addToSyncQueue({
        operation: 'delete',
        table: 'customers',
        data: { id },
        storeId: activeStore.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', activeStore?.id] })
    },
  })
}

/**
 * Resolve a customer's photo to a displayable URL: the device copy first (works
 * offline and shows un-uploaded photos), then a signed URL from storage.
 */
export function useCustomerPhotoUrl(
  customer: LocalCustomer | null | undefined,
  slot: PhotoSlot = 'front'
): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const customerId = customer?.id ?? null
  const photoPath = customer?.[PHOTO_PATH_COLUMN[slot]] ?? null

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function resolve() {
      if (!customerId) {
        setUrl(null)
        return
      }

      const local = await getLocalPhoto(customerId, slot)
      if (local) {
        objectUrl = URL.createObjectURL(local.blob)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = null
          return
        }
        setUrl(objectUrl)
        return
      }

      if (photoPath) {
        const signed = await getCustomerPhotoUrl(photoPath)
        if (!cancelled) setUrl(signed)
        return
      }

      if (!cancelled) setUrl(null)
    }

    resolve()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [customerId, photoPath, slot])

  return url
}
