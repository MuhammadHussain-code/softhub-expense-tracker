import { useCallback, useEffect, useRef, useState } from 'react'
import { Images, Loader2, RefreshCw, X } from 'lucide-react'

interface CameraCaptureProps {
  open: boolean
  onClose: () => void
  /** A frame grabbed from the camera, or a file the user picked from the gallery */
  onSelect: (blob: Blob) => void
  /** Called when the camera cannot be used at all, so the caller can fall back */
  onUnavailable: () => void
}

/**
 * Full-screen camera view with a shutter button and a gallery shortcut, so one
 * tap gets you a photo without leaving the app — and the gallery is still one
 * tap away from the same screen.
 */
export function CameraCapture({ open, onClose, onSelect, onUnavailable }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function start() {
      setIsStarting(true)

      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable()
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setIsStarting(false)
      } catch (error) {
        console.error('Camera unavailable:', error)
        if (!cancelled) onUnavailable()
      }
    }

    start()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, facingMode, onUnavailable, stopStream])

  const handleShutter = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopStream()
          onSelect(blob)
        }
      },
      'image/jpeg',
      0.92
    )
  }

  const handleGalleryPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    stopStream()
    onSelect(file)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => {
            stopStream()
            onClose()
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Close camera"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() =>
            setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'))
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Switch camera"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-10 p-6 pb-10">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleGalleryPick}
        />
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white"
          aria-label="Choose from gallery"
        >
          <Images className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={handleShutter}
          disabled={isStarting}
          className="h-18 w-18 rounded-full border-4 border-white/40 bg-white p-1 disabled:opacity-50"
          aria-label="Take photo"
        >
          <span className="block h-full w-full rounded-full bg-white shadow-inner" />
        </button>

        {/* Spacer keeps the shutter centred */}
        <span className="h-14 w-14" aria-hidden="true" />
      </div>
    </div>
  )
}
