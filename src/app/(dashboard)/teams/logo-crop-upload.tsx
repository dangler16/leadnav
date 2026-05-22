'use client'

import { useRef, useState } from 'react'
import { Check, X, ImagePlus } from 'lucide-react'

const CROP_SIZE = 200
const OUTPUT_SIZE = 400

type CropState = {
  objectUrl: string
  naturalWidth: number
  naturalHeight: number
  scale: number
  minScale: number
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

export function LogoCropUpload({
  currentUrl,
  onBlobChange,
}: {
  currentUrl: string | null
  onBlobChange: (blob: Blob | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [drag, setDrag] = useState<DragAnchor | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.type === 'image/svg+xml') {
      const url = URL.createObjectURL(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
      setCleared(false)
      onBlobChange(file)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const minScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
      const displayW = img.naturalWidth * minScale
      const displayH = img.naturalHeight * minScale
      setCrop({
        objectUrl,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        scale: minScale,
        minScale,
        offsetX: -(displayW - CROP_SIZE) / 2,
        offsetY: -(displayH - CROP_SIZE) / 2,
      })
    }
    img.src = objectUrl
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
      crop.scale, crop.naturalWidth, crop.naturalHeight,
    )
    setCrop(prev => prev ? { ...prev, offsetX: x, offsetY: y } : prev)
  }

  function handleScaleChange(newScale: number) {
    if (!crop) return
    const { x, y } = clampOffset(crop.offsetX, crop.offsetY, newScale, crop.naturalWidth, crop.naturalHeight)
    setCrop(prev => prev ? { ...prev, scale: newScale, offsetX: x, offsetY: y } : prev)
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
        if (!blob) return
        const url = URL.createObjectURL(blob)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(url)
        URL.revokeObjectURL(crop.objectUrl)
        setCrop(null)
        setCleared(false)
        onBlobChange(blob)
      }, 'image/png')
    }
    img.src = crop.objectUrl
  }

  function handleCancel() {
    if (crop) { URL.revokeObjectURL(crop.objectUrl); setCrop(null) }
  }

  function handleClear() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    setCleared(true)
    if (inputRef.current) inputRef.current.value = ''
    onBlobChange(null)
  }

  const displayUrl = previewUrl ?? (cleared ? null : currentUrl)

  return (
    <>
      {crop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <p className="text-sm font-medium text-gray-900">Drag to reposition</p>
            <div
              className="rounded-md overflow-hidden cursor-grab active:cursor-grabbing border-2 border-gray-200 select-none"
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
            <div className="w-full flex items-center gap-2">
              <span className="text-xs text-gray-500">Size</span>
              <input
                type="range"
                min={crop.minScale}
                max={crop.minScale * 3}
                step={0.001}
                value={crop.scale}
                onChange={e => handleScaleChange(parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={13} /> Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Check size={13} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center w-16 h-16 rounded-md border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
        >
          {displayUrl ? (
            <img src={displayUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <ImagePlus size={20} className="text-gray-400" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
        {displayUrl && (
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          >
            Remove
          </button>
        )}
      </div>
    </>
  )
}
