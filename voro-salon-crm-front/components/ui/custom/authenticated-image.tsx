"use client"

import { useState } from "react"
import { Image as ImageIcon } from "lucide-react"

interface AuthenticatedImageProps {
  src: string
  alt: string
  className?: string
}

// Resolve a origem final da imagem sem baixar nada por conta própria: o browser
// faz a requisição e guarda o resultado no cache HTTP (o proxy responde com
// Cache-Control imutável). Baixar via fetch + createObjectURL refazia o download
// a cada montagem do componente.
function resolveSrc(src: string): string | null {
  if (!src) return null

  // data url ou blob local (preview de upload ainda não enviado)
  if (src.startsWith("data:") || src.startsWith("blob:")) return src

  // imagem externa que não passa pelo Vercel Blob
  if (!src.includes("blob.vercel-storage.com")) return src

  return `/api/blob/proxy?url=${encodeURIComponent(src)}`
}

export function AuthenticatedImage({ src, alt, className }: AuthenticatedImageProps) {
  // guarda a url que falhou (e não um booleano) para que trocar de imagem
  // volte a tentar renderizar sem precisar de efeito para limpar o estado
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const resolvedSrc = resolveSrc(src)

  if (!resolvedSrc || resolvedSrc === failedSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted/30`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(resolvedSrc)}
    />
  )
}
