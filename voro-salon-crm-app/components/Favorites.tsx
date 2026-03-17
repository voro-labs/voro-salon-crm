import { useMemo, useState } from "react"
import {
	View,
	Text,
	Pressable,
	Image,
	FlatList,
	ScrollView,
	Dimensions,
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

interface FavoritesProps {
	superLiked: MediaItem[]
	onRemove: (id: string) => void
}

export function Favorites({ superLiked, onRemove }: FavoritesProps) {
	const [filter, setFilter] = useState<ContentType | "all">("all")

	const filtered = useMemo(() => {
		if (filter === "all") return superLiked
		return superLiked.filter((item) => item.type === filter)
	}, [filter, superLiked])

	if (superLiked.length === 0) {
		return (
			<View className="flex-1 items-center justify-center px-6">
				<View className="items-center">
					<View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-amber-100">
						<Ionicons name="star" size={40} color="#f59e0b" fill="#f59e0b" />
					</View>
					<Text className="text-xl font-semibold text-white text-center">
						Nenhum favorito ainda
					</Text>
					<Text className="mt-2 text-sm text-gray-400 text-center max-w-xs">
						Deslize para cima ou toque na estrela em conteúdos que você já
						assistiu, leu ou escutou e recomenda!
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
							Favoritos
						</Text>
						<Text className="text-sm text-gray-400 mb-3">
							{`${superLiked.length} ${superLiked.length === 1 ? "conteúdo" : "conteúdos"
								} que você já assistiu, leu ou escutou`}
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
											? superLiked.length
											: superLiked.filter((i) => i.type === cf.value).length

									if (cf.value !== "all" && count === 0) return null

									const active = filter === cf.value

									return (
										<Pressable
											key={cf.value}
											onPress={() => setFilter(cf.value)}
											className={`px-3 py-1.5 rounded-full ${active
												? "bg-amber-500"
												: "bg-zinc-800"
												}`}
										>
											<Text
												className={`text-xs font-medium ${active ? "text-white" : "text-gray-400"
													}`}
											>
												{cf.label} <Text className="opacity-60">{count}</Text>
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

							<View className="absolute top-2 left-2 flex-row items-center gap-1 bg-amber-500 px-2 py-0.5 rounded-full">
								<Ionicons name="star" size={12} color="#fff" fill="#fff" />
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

							<View className="absolute inset-0 rounded-2xl border border-amber-400/30 pointer-events-none" />
						</View>
					</View>
				)}
				ListEmptyComponent={
					superLiked.length > 0 ? (
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