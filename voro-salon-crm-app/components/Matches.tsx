import { useMemo, useState } from "react"
import {
  View,
  Text,
  Pressable,
  Image,
  FlatList,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { MediaItem } from "lib/types"

export type ContentType = "movie" | "series" | "anime" | "song" | "book"

const TYPE_LABELS: Record<ContentType, string> = {
  movie: "Filme",
  series: "Série",
  anime: "Anime",
  song: "Música",
  book: "Livro",
}

const CONTENT_FILTERS: { label: string; value: ContentType | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Filmes", value: "movie" },
  { label: "Séries", value: "series" },
  { label: "Anime", value: "anime" },
  { label: "Músicas", value: "song" },
  { label: "Livros", value: "book" },
]

interface MatchesProps {
  liked: MediaItem[]
  onRemove: (id: string) => void
}

export function Matches({ liked, onRemove }: MatchesProps) {
  const [filter, setFilter] =
    useState<ContentType | "all">("all")

  const filtered = useMemo(() => {
    if (filter === "all") return liked
    return liked.filter((item) => item.type === filter)
  }, [filter, liked])

  if (liked.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
            <Ionicons name="heart" size={40} color="#ec4899" />
          </View>
          <Text className="text-xl font-semibold text-white">
            Nenhum match ainda
          </Text>
          <Text className="mt-2 text-sm text-gray-400 text-center max-w-xs">
            Deslize para a direita para adicionar conteúdos à sua lista!
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <Text className="text-lg font-bold text-white mb-0.5">
              Minha Lista
            </Text>
            <Text className="text-sm text-gray-400 mb-3">
              {`${liked.length} ${liked.length === 1 ? "conteúdo" : "conteúdos"
                } que você quer assistir, ler ou escutar`}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row gap-2 pr-2">
                {CONTENT_FILTERS.map((cf) => {
                  const count =
                    cf.value === "all"
                      ? liked.length
                      : liked.filter(
                        (i) => i.type === cf.value
                      ).length

                  if (
                    cf.value !== "all" &&
                    count === 0
                  )
                    return null

                  const active =
                    filter === cf.value

                  return (
                    <Pressable
                      key={cf.value}
                      onPress={() =>
                        setFilter(cf.value)
                      }
                      className={`px-3 py-1.5 rounded-full ${active
                        ? "bg-pink-500"
                        : "bg-zinc-800"
                        }`}
                    >
                      <Text
                        className={`text-xs font-medium ${active ? "text-white" : "text-gray-400"}`}
                      >
                        <Text>{cf.label}</Text>{" "}
                        <Text className="opacity-60">{count}</Text>
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <View className="w-1/2 p-1.5">
            <View className="relative rounded-2xl bg-zinc-900 overflow-hidden">
              <View className="w-full aspect-[3/4]">
                <Image
                  source={{ uri: item.cover }}
                  resizeMode="cover"
                  className="w-full h-full"
                />
              </View>

              <View className="absolute top-2 left-2 bg-pink-500 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-semibold text-white">
                  {TYPE_LABELS[item.type]}
                </Text>
              </View>

              <Pressable
                onPress={() => onRemove(item.id)}
                className="absolute top-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-black/60"
              >
                <Ionicons name="trash" size={14} color="#fff" />
              </Pressable>

              <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
                <Text className="text-sm font-semibold text-white">
                  {item.title}
                </Text>
                {!!item.year && (
                  <Text className="text-xs text-gray-300 mt-0.5">
                    {item.year}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          liked.length > 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-sm text-gray-400">
                Nenhum conteúdo nesta categoria.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}