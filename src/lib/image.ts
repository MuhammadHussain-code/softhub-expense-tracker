/**
 * Browser-side image compression.
 *
 * Phone cameras produce 3-8 MB files, which are far too heavy for a shop
 * running on mobile data. Everything is resized so the longest edge fits
 * MAX_EDGE and re-encoded as JPEG, landing around 100-200 KB.
 */

const MAX_EDGE = 1000
const QUALITY = 0.8

export const PHOTO_MIME_TYPE = 'image/jpeg'

/**
 * Resize and re-encode an image (a picked file or a camera frame) as a JPEG blob.
 * Throws if it cannot be decoded as an image.
 */
export async function compressImage(source: Blob): Promise<Blob> {
  // `from-image` applies EXIF orientation, so phone photos are not sideways
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, PHOTO_MIME_TYPE, QUALITY)
    )

    if (!blob) throw new Error('Failed to encode image')

    return blob
  } finally {
    bitmap.close()
  }
}
