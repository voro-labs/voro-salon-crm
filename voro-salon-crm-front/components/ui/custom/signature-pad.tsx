"use client"

import { useRef, useState, useCallback } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SignaturePadProps {
  /** Called with the canvas dataUrl each time the user finishes a stroke. */
  onSign: (dataUrl: string) => void
  /** Called when the canvas is cleared. */
  onClear: () => void
  /** Placeholder text shown when the canvas is empty. */
  placeholder?: string
}

export function SignaturePad({ onSign, onClear, placeholder = "Assine aqui" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current
    if (!c) return
    e.preventDefault()
    setIsDrawing(true)
    lastPos.current = getPos(e, c)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const c = canvasRef.current
    if (!c) return
    e.preventDefault()
    const ctx = c.getContext("2d")
    if (!ctx || !lastPos.current) return
    const pos = getPos(e, c)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#1a1a1a"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
    const c = canvasRef.current
    if (c && hasSignature) {
      onSign(c.toDataURL("image/png"))
    }
  }, [hasSignature, onSign])

  const handleClear = () => {
    const c = canvasRef.current
    if (!c) return
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height)
    setHasSignature(false)
    onClear()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Limpar
        </Button>
      </div>
      <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-40 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/40 text-sm select-none">{placeholder}</p>
          </div>
        )}
      </div>
    </div>
  )
}
