"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FadeImageProps {
  src?: string
  alt?: string
  className?: string
}

export function FadeImage({ src, alt, className }: FadeImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-muted", className)}>
      {/* Placeholder */}
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <ImageIcon className="h-14 w-14" />
      </div>

      {/* Image */}
      {src && !error && (
        <Image
          src={src}
          alt={alt || "Imagem"}
          fill
          sizes="(max-width: 768px) 100vw, 80vw"
          className={cn(
            "object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoadingComplete={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}
