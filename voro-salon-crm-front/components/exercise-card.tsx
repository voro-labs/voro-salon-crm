"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Eye, Globe, User, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FadeImage } from "./fade-image"

interface ExerciseCardProps {
  id: string
  name: string
  muscleGroup: string
  type: "public" | "custom"
  thumbnail?: string
}

export function ExerciseCard({
  id,
  name,
  muscleGroup,
  type,
  thumbnail,
}: ExerciseCardProps) {
  const [imgSrc, setImgSrc] = useState(thumbnail)

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      {/* Thumbnail */}
      <div className="aspect-video">
        <FadeImage
          src={imgSrc}
          alt={name}
        />

        {/* Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {type === "public" ? (
              <>
                <Globe className="h-3 w-3" />
                Público
              </>
            ) : (
              <>
                <User className="h-3 w-3" />
                Personalizado
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold leading-tight line-clamp-1">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{muscleGroup}</p>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link
            href={`/exercises/${id}`}
            className="flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Ver detalhes
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
