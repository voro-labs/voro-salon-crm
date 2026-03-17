import {
  View,
  Text,
  Pressable,
} from "react-native"
import { Filters } from "lib/use-swipe-store"

const TYPE_EMOJI: Record<string, string> = {
  all: "🌟",
  movie: "🎬",
  series: "📺",
  anime: "⛩️",
  song: "🎵",
  book: "📚",
}

const TYPE_LABELS: Record<string, string> = {
  all: "Tudo",
  movie: "Filmes",
  series: "Séries",
  anime: "Anime",
  song: "Músicas",
  book: "Livros",
}

const GENRE_LABELS: Record<string, string> = {
  Action: "Ação",
  Romance: "Romance",
  Comedy: "Comédia",
  Drama: "Drama",
  Fantasy: "Fantasia",
  "Sci-Fi": "Sci-Fi",
  Horror: "Horror",
  Thriller: "Thriller",
  Mystery: "Mistério",
}

interface ActiveFiltersBarProps {
  filters: Filters
  onReset: () => void
}

export function ActiveFiltersBar({
  filters,
  onReset,
}: ActiveFiltersBarProps) {
  const chips: string[] = []

  chips.push(
    `${TYPE_EMOJI[filters.contentType]} ${TYPE_LABELS[filters.contentType]
    }`
  )

  if (filters.genre !== "all") {
    chips.push(GENRE_LABELS[filters.genre] || filters.genre)
  }

  if (filters.era !== "all") {
    chips.push(filters.era)
  }

  return (
    <View className="flex-row items-center">
      {chips.map((chip) => (
        <View
          key={chip}
          className="px-2.5 py-1 rounded-full bg-pink-500/20"
        >
          <Text className="text-xs text-pink-400 font-medium">
            {chip}
          </Text>
        </View>
      ))}

      <Pressable onPress={onReset} className="ml-2">
        <Text className="text-xs text-gray-400">
          Alterar filtros
        </Text>
      </Pressable>
    </View>
  )
}