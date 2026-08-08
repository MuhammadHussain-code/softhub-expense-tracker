import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { compressImage } from '@/lib/image'
import { CameraCapture } from './camera-capture'
import type { PhotoChange } from '@/hooks/use-customers'

interface CustomerPhotoInputProps {
  /** Shown above the picker, e.g. "Front photo" */
  label: string
  /** URL of the already-saved photo, if any (resolves asynchronously) */
  initialUrl: string | null
  /** undefined = unchanged, null = remove, Blob = replace */
  onChange: (photo: PhotoChange) => void
}

export function CustomerPhotoInput({ label, initialUrl, onChange }: CustomerPhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  // Once the user picks or removes a photo, the saved one no longer drives the preview
  const [isTouched, setIsTouched] = useState(false)

  // The saved photo's URL arrives async (signed URL), so pick it up when it lands
  useEffect(() => {
    if (!isTouched) setPreview(initialUrl)
  }, [initialUrl, isTouched])

  // Release the last object URL when this input goes away
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const setObjectUrl = (url: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
  }

  const acceptPhoto = async (source: Blob) => {
    setIsCameraOpen(false)
    setIsProcessing(true)
    try {
      const blob = await compressImage(source)
      const url = URL.createObjectURL(blob)
      setObjectUrl(url)
      setPreview(url)
      setIsTouched(true)
      onChange(blob)
    } catch (error) {
      console.error('Failed to process photo:', error)
      toast.error('Could not read that photo. Try another one.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow picking the same file again
    if (!file) return
    acceptPhoto(file)
  }

  // No camera (denied, unsupported, or insecure origin): fall back to the picker
  const handleCameraUnavailable = useCallback(() => {
    setIsCameraOpen(false)
    toast.error('Camera not available. Pick a photo instead.')
    inputRef.current?.click()
  }, [])

  const handleRemove = () => {
    setObjectUrl(null)
    setPreview(null)
    setIsTouched(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {preview ? (
            <img src={preview} alt="Customer" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* No `capture` attribute: the OS then offers camera *and* gallery */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => setIsCameraOpen(true)}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {preview ? 'Change photo' : 'Add photo'}
          </Button>

          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSelect={acceptPhoto}
        onUnavailable={handleCameraUnavailable}
      />
    </div>
  )
}
