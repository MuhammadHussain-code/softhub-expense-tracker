import { supabase } from './supabase'
import { PHOTO_MIME_TYPE } from './image'

/**
 * Private bucket holding one photo per customer.
 * Objects live at {store_id}/{customer_id}.jpg — storage RLS grants access by
 * matching the first path segment against the caller's stores.
 */
export const CUSTOMER_PHOTOS_BUCKET = 'customer-photos'

const SIGNED_URL_TTL_SECONDS = 60 * 60

export function customerPhotoPath(storeId: string, customerId: string): string {
  return `${storeId}/${customerId}.jpg`
}

/**
 * Upload a customer photo, replacing any previous one at the same path.
 * Returns the storage path to persist on the customer row.
 */
export async function uploadCustomerPhoto(
  storeId: string,
  customerId: string,
  blob: Blob
): Promise<string> {
  const path = customerPhotoPath(storeId, customerId)

  const { error } = await supabase.storage
    .from(CUSTOMER_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: PHOTO_MIME_TYPE, upsert: true })

  if (error) throw error

  return path
}

/**
 * Create a temporary signed URL for a stored photo.
 * Returns null when the object is missing or unreadable.
 */
export async function getCustomerPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CUSTOMER_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data) return null

  return data.signedUrl
}

/**
 * Best-effort removal of a stored photo. A failure here only leaves an orphan
 * object behind, so it is logged rather than surfaced to the user.
 */
export async function deleteCustomerPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(CUSTOMER_PHOTOS_BUCKET).remove([path])
  if (error) {
    console.error('Failed to delete customer photo:', error)
  }
}
