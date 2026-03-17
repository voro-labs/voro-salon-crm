import { useState } from "react"
import {
	View,
	Text,
	Pressable,
} from "react-native"
import { Ionicons } from '@expo/vector-icons';
import { Filters } from "lib/use-swipe-store"
import { ContentType, Era, Genre } from "lib/types"

interface FilterOnboardingProps {
	onComplete: (filters: Filters) => void
	contentTypes: {
		label: string
		value: ContentType
		emoji: string
		disabled?: boolean
	}[]
}

const GENRES = [
	{ label: "Ação", value: "Action" },
	{ label: "Romance", value: "Romance" },
	{ label: "Comédia", value: "Comedy" },
	{ label: "Drama", value: "Drama" },
	{ label: "Fantasia", value: "Fantasy" },
	{ label: "Sci-Fi", value: "Sci-Fi" },
	{ label: "Horror", value: "Horror" },
	{ label: "Thriller", value: "Thriller" },
	{ label: "Mistério", value: "Mystery" },
] as const

const ERAS = [
	{ label: "Anos 70", value: "1970s" },
	{ label: "Anos 80", value: "1980s" },
	{ label: "Anos 90", value: "1990s" },
	{ label: "Anos 2000", value: "2000s" },
	{ label: "Anos 2010", value: "2010s" },
	{ label: "2020+", value: "2020+" },
] as const

export function FilterOnboarding({
	onComplete,
	contentTypes,
}: FilterOnboardingProps) {
	const [step, setStep] = useState(0)
	const [contentType, setContentType] =
		useState<ContentType | "all">("all")
	const [genre, setGenre] = useState<Genre | "all">("all")
	const [era, setEra] = useState<Era | "all">("all")

	const handleFinish = () => {
		onComplete({ contentType, genre, era })
	}

	return (
		<View className="flex-1 items-center justify-center px-6">
			<View className="w-full max-w-sm space-y-6">

				<View className="flex-row items-center justify-center gap-2 mb-4">
					{[0, 1, 2].map((s) => (
						<View
							key={s}
							className={`h-1.5 rounded-full ${s === step
								? "w-8 bg-pink-500"
								: s < step
									? "w-6 bg-pink-400"
									: "w-6 bg-zinc-700"
								}`}
						/>
					))}
				</View>

				{step === 0 && (
					<View className="space-y-4">
						<View className="items-center">
							<Text className="text-xl font-bold text-white">
								O que você quer explorar?
							</Text>
							<Text className="text-sm text-gray-400 text-center">
								Escolha um tipo de conteúdo para começar
							</Text>
						</View>

						<View className="flex-row flex-wrap gap-2.5 justify-center">
							<Pressable
								onPress={() => setContentType("all")}
								className={`px-4 py-3.5 rounded-xl w-full ${contentType === "all"
									? "bg-pink-500"
									: "bg-zinc-900 border border-zinc-700"
									}`}
							>
								<Text className="text-white font-medium text-sm text-center">
									🌟 Tudo junto
								</Text>
							</Pressable>

							{contentTypes.map((ct) => (
								<Pressable
									key={ct.value}
									disabled={ct.disabled}
									onPress={() => setContentType(ct.value)}
									className={`px-4 py-3.5 rounded-xl w-[48%] ${ct.disabled
										? "opacity-40"
										: contentType === ct.value
											? "bg-pink-500"
											: "bg-zinc-900 border border-zinc-700"
										}`}
								>
									<Text className="text-white font-medium text-sm">
										{ct.emoji} {ct.label}
									</Text>
								</Pressable>
							))}
						</View>

						<Pressable
							onPress={() => setStep(1)}
							className="flex-row items-center justify-center mt-2 rounded-xl bg-purple-500 px-4 py-3"
						>
							<Text className="text-white font-semibold text-sm">
								Próximo
							</Text>
							<Ionicons name="chevron-forward" size={16} color="#fff" />
						</Pressable>
					</View>
				)}

				{step === 1 && (
					<View className="space-y-4">
						<View className="items-center">
							<Text className="text-xl font-bold text-white">
								Algum gênero favorito?
							</Text>
							<Text className="text-sm text-gray-400 text-center">
								Opcional — pule se quiser ver de tudo
							</Text>
						</View>

						<View className="flex-row flex-wrap gap-2 justify-center">
							{GENRES.map((g) => (
								<Pressable
									key={g.value}
									onPress={() =>
										setGenre(genre === g.value ? "all" : g.value)
									}
									className={`px-4 py-2 rounded-full ${genre === g.value
										? "bg-pink-500"
										: "bg-zinc-900 border border-zinc-700"
										}`}
								>
									<Text className="text-white text-sm">
										{g.label}
									</Text>
								</Pressable>
							))}
						</View>

						<View className="flex-row gap-2">
							<Pressable
								onPress={() => setStep(0)}
								className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 mt-2 px-4 py-3"
							>
								<Text className="text-white text-center text-sm">
									Voltar
								</Text>
							</Pressable>

							<Pressable
								onPress={() => setStep(2)}
								className="flex-1 flex-row items-center justify-center mt-2 rounded-xl bg-purple-500 px-4 py-3"
							>
								<Text className="text-white font-semibold text-sm">
									{genre === "all" ? "Pular" : "Próximo"}
								</Text>
								<Ionicons name="chevron-forward" size={16} color="#fff" />
							</Pressable>
						</View>
					</View>
				)}

				{step === 2 && (
					<View className="space-y-4">
						<View className="items-center">
							<Text className="text-xl font-bold text-white">
								Alguma época preferida?
							</Text>
							<Text className="text-sm text-gray-400 text-center">
								Opcional — pule se quiser ver todas as épocas
							</Text>
						</View>

						<View className="flex-row flex-wrap gap-2 justify-center">
							{ERAS.map((e) => (
								<Pressable
									key={e.value}
									onPress={() =>
										setEra(era === e.value ? "all" : e.value)
									}
									className={`px-4 py-2.5 rounded-full ${era === e.value
										? "bg-pink-500"
										: "bg-zinc-900 border border-zinc-700"
										}`}
								>
									<Text className="text-white text-sm">
										{e.label}
									</Text>
								</Pressable>
							))}
						</View>

						<View className="flex-row gap-2">
							<Pressable
								onPress={() => setStep(1)}
								className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 mt-2 px-4 py-3"
							>
								<Text className="text-white text-center text-sm">
									Voltar
								</Text>
							</Pressable>

							<Pressable
								onPress={handleFinish}
								className="flex-1 flex-row items-center justify-center mt-2 rounded-xl bg-purple-500 px-4 py-3"
							>
								<Ionicons name="flame" size={16} color="#fff" />
								<Text className="text-white font-semibold text-sm">
									Começar!
								</Text>
							</Pressable>
						</View>
					</View>
				)}
			</View>
		</View>
	)
}
