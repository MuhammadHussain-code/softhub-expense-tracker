import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { compressImage } from '@/lib/image'
import type { PhotoChange } from '@/hooks/use-customers'

interface CustomerPhotoInputProps {
  /** URL of the already-saved photo, if any (resolves asynchronously) */
  initialUrl: string | null
  /** undefined = unchanged, null = remove, Blob = replace */
  onChange: (photo: PhotoChange) => void
}

export function CustomerPhotoInput({ initialUrl, onChange }: CustomerPhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [isProcessing, setIsProcessing] = useState(false)
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow picking the same file again
    if (!file) return

    setIsProcessing(true)
    try {
      const blob = await compressImage(file)
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

  const handleRemove = () => {
    setObjectUrl(null)
    setPreview(null)
    setIsTouched(true)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <Label>Photo</Label>

      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {preview ? (
            <img src={preview} alt="Customer" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
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
    </div>
  )
}
