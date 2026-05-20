'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, X } from 'lucide-react'
import { uploadProfilePicture } from './actions'

const CROP_SIZE = 200
const OUTPUT_SIZE = 400

type CropState = {
  objectUrl: string
  naturalWidth: number
  naturalHeight: number
  scale: number
  offsetX: number
  offsetY: number
}

type DragAnchor = {
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clampOffset(ox: number, oy: number, scale: number, natW: number, natH: number) {
  return {
    x: clamp(ox, -(natW * scale - CROP_SIZE), 0),
    y: clamp(oy, -(natH * scale - CROP_SIZE), 0),
  }
}

export function AvatarUpload({ currentUrl, initials }: {
  currentUrl: string | null
  initials: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [drag, setDrag] = useState<DragAnchor | null>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
      const displayW = img.naturalWidth * scale
      const displayH = img.naturalHeight * scale
      setCrop({
        objectUrl,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        scale,
        offsetX: -(displayW - CROP_SIZE) / 2,
        offsetY: -(displayH - CROP_SIZE) / 2,
      })
    }
    img.src = objectUrl
    setError(null)
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!crop) return
    e.preventDefault()
    setDrag({ startX: e.clientX, startY: e.clientY, startOffsetX: crop.offsetX, startOffsetY: crop.offsetY })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!drag || !crop) return
    const { x, y } = clampOffset(
      drag.startOffsetX + (e.clientX - drag.startX),
      drag.startOffsetY + (e.clientY - drag.startY),
      crop.scale, crop.naturalWidth, crop.naturalHeight
    )
    setCrop(prev => prev ? { ...prev, offsetX: x, offsetY: y } : prev)
  }

  function handleConfirm() {
    if (!crop) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const srcX = -crop.offsetX / crop.scale
      const srcY = -crop.offsetY / crop.scale
      const srcSize = CROP_SIZE / crop.scale
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      canvas.toBlob(blob => {
        if (!blob) { setError('Failed to process image.'); return }
        const previewUrl = URL.createObjectURL(blob)
        setPreview(previewUrl)
        URL.revokeObjectURL(crop.objectUrl)
        setCrop(null)
        const formData = new FormData()
        formData.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
        startTransition(async () => {
          try {
            await uploadProfilePicture(formData)
            router.refresh()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
            setPreview(null)
          } finally {
            URL.revokeObjectURL(previewUrl)
          }
        })
      }, 'image/jpeg', 0.92)
    }
    img.src = crop.objectUrl
  }

  function handleCancel() {
    if (crop) { URL.revokeObjectURL(crop.objectUrl); setCrop(null) }
  }

  const displayUrl = preview ?? currentUrl

  return (
    <div className="flex flex-col items-start gap-1">

      {crop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <p className="text-sm font-medium text-gray-900">Drag to reposition</p>
            <div
              className="rounded-full overflow-hidden cursor-grab active:cursor-grabbing border-2 border-gray-200 select-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE, position: 'relative' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setDrag(null)}
              onMouseLeave={() => setDrag(null)}
            >
              <img
                src={crop.objectUrl}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  width: crop.naturalWidth * crop.scale,
                  height: crop.naturalHeight * crop.scale,
                  transform: `translate(${crop.offsetX}px, ${crop.offsetY}px)`,
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Check size={13} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="relative group cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-600 text-base font-bold flex-shrink-0">
          {displayUrl ? (
            <img src={displayUrl} alt="Profile picture" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isPending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={13} className="text-white" />
          )}
        </div>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
