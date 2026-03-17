import { ContentType } from "./types"

export const CONTENT_TYPES: { label: string; emoji: string; value: ContentType, disabled: boolean }[] = [
  { label: "Filmes", emoji: "🎬", value: "movie", disabled: false },
  { label: "Séries", emoji: "📺", value: "series", disabled: false },
  { label: "Anime", emoji: "⛩️", value: "anime", disabled: false },
  { label: "Músicas", emoji: "🎵", value: "song", disabled: true },
  { label: "Livros", emoji: "📚", value: "book", disabled: false },
]
