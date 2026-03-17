import React from "react"
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { MediaItem } from "lib/types"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

interface MediaDetailModalProps {
  isVisible: boolean
  onClose: () => void
  item: MediaItem
}

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  series: "Series",
  anime: "Anime",
  song: "Song",
  book: "Book",
}

export function MediaDetailModal({
  isVisible,
  onClose,
  item,
}: MediaDetailModalProps) {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <ScrollView className="flex-1" bounces={false}>
          {/* Header Image */}
          <View style={{ height: SCREEN_HEIGHT * 0.6 }} className="relative">
            <Image
              source={{ uri: item.cover }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/40 to-transparent pt-32">
              <View className="flex-row items-end flex-wrap mb-2">
                <Text className="text-4xl font-black text-white tracking-tight mr-3">
                  {item.title}
                </Text>
                <Text className="text-2xl font-medium text-white/70 mb-1">
                  {item.year}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="bg-white/20 px-3 py-1 rounded-full border border-white/10 mr-2">
                  <Text className="text-[10px] font-bold text-white uppercase tracking-widest">
                    {TYPE_LABELS[item.type]}
                  </Text>
                </View>
                <View className="flex-row items-center bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Ionicons name="calendar-outline" size={12} color="#fff" />
                  <Text className="ml-1 text-[11px] font-bold text-white uppercase">
                    {item.era}
                  </Text>
                </View>
              </View>
            </View>

            {/* Close Button */}
            <Pressable
              onPress={onClose}
              className="absolute top-12 right-6 h-10 w-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Details Section */}
          <View className="p-6">
            <Text className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
              Sinopse
            </Text>
            <Text className="text-white/90 text-lg leading-relaxed font-medium mb-8">
              {item.description}
            </Text>

            <Text className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
              Gêneros
            </Text>
            <View className="flex-row flex-wrap mb-8">
              {item.genres.map((genre) => (
                <View
                  key={genre}
                  className="bg-zinc-800 px-4 py-2 rounded-xl mr-2 mb-2 border border-zinc-700"
                >
                  <Text className="text-white font-semibold text-sm">
                    {genre}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
              Tags
            </Text>
            <View className="flex-row flex-wrap">
              {item.keywords.map((kw) => (
                <Text
                  key={kw}
                  className="text-purple-400 font-bold mr-3 mb-2 text-sm"
                >
                  #{kw}
                </Text>
              ))}
            </View>
          </View>

          {/* Bottom spacing */}
          <View className="h-20" />
        </ScrollView>
      </View>
    </Modal>
  )
}
