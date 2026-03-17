import React, { useRef, useState } from "react"
import {
  View,
  Text,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
} from "react-native"
import { Ionicons } from '@expo/vector-icons';
import { MediaDetailModal } from "./MediaDetailModal"
import { MediaItem } from "lib/types"

const { width } = Dimensions.get("window")

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  series: "Series",
  anime: "Anime",
  song: "Song",
  book: "Book",
}

type FlyDirection = "left" | "right" | "up" | null

interface SwipeCardProps {
  item: MediaItem
  onSwipeLeft: () => void
  onSwipeRight: () => void
  onSwipeUp: () => void
  onDrag?: (position: { x: number, y: number }) => void
  isTop: boolean
  style?: any
}

export function SwipeCard({
  item,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onDrag,
  isTop,
  style,
}: SwipeCardProps) {
  const translate = useRef(new Animated.ValueXY()).current
  const [flying, setFlying] = useState<FlyDirection>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Use a ref to store the latest props to avoid stale closures in PanResponder
  const propsRef = useRef({ isTop, flying, isModalVisible, onDrag })
  propsRef.current = { isTop, flying, isModalVisible, onDrag }

  const thresholdX = 120
  const thresholdY = -100

  const triggerFly = (dir: FlyDirection) => {
    setFlying(dir)

    let toValue = { x: 0, y: 0 }

    if (dir === "right") toValue = { x: width * 1.5, y: 0 }
    if (dir === "left") toValue = { x: -width * 1.5, y: 0 }
    if (dir === "up") toValue = { x: 0, y: -width * 1.5 }

    Animated.timing(translate, {
      toValue,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      if (dir === "right") onSwipeRight()
      else if (dir === "left") onSwipeLeft()
      else if (dir === "up") onSwipeUp()

      setFlying(null)
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () =>
        propsRef.current.isTop && !propsRef.current.isModalVisible,
      onPanResponderMove: (_: any, gesture: any) => {
        if (!propsRef.current.isTop || propsRef.current.flying || propsRef.current.isModalVisible) return
        translate.setValue({ x: gesture.dx, y: gesture.dy })
        if (propsRef.current.onDrag) propsRef.current.onDrag({ x: gesture.dx, y: gesture.dy })
      },
      onPanResponderRelease: (_: any, gesture: any) => {
        if (!propsRef.current.isTop || propsRef.current.isModalVisible) return

        if (
          gesture.dy < thresholdY &&
          Math.abs(gesture.dx) < Math.abs(gesture.dy)
        ) {
          triggerFly("up")
        } else if (gesture.dx > thresholdX) {
          triggerFly("right")
        } else if (gesture.dx < -thresholdX) {
          triggerFly("left")
        } else {
          Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start(() => {
            if (propsRef.current.onDrag) propsRef.current.onDrag({ x: 0, y: 0 })
          })
        }
      },
    })
  ).current

  const rotation = translate.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-15deg", "0deg", "15deg"],
  })

  const likeOpacity = translate.x.interpolate({
    inputRange: [0, thresholdX / 2, thresholdX],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  })

  const dislikeOpacity = translate.x.interpolate({
    inputRange: [-thresholdX, -thresholdX / 2, 0],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  })

  const opacityY = translate.y.interpolate({
    inputRange: [thresholdY, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })

  const isSuperLikeGesture = translate.y
    ? Number(translate.y) < -30
    : false

  // Extract external transform if it exists
  const externalTransform = style?.transform || []

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        style,
        {
          transform: [
            ...externalTransform,
            { translateX: translate.x },
            { translateY: translate.y },
            { rotate: rotation },
          ],
        },
      ]}
      className="absolute inset-0 items-center justify-center"
    >
      <View className="w-full max-w-sm mx-4 rounded-[32px] bg-card overflow-hidden shadow-2xl border border-white/10 h-full">
        <View className="flex-1 relative overflow-hidden">
          <Image
            source={{ uri: item.cover }}
            resizeMode="cover"
            className="w-full h-full absolute inset-0"
          />

          {/* Top segment bars for aesthetic */}
          <View className="absolute top-3 left-4 right-4 flex-row space-x-2 z-30">
            <View className="flex-1 h-1 rounded-full bg-white/40" />
            <View className="flex-1 h-1 rounded-full bg-white/20" />
            <View className="flex-1 h-1 rounded-full bg-white/20" />
          </View>

          {isTop && (
            <>
              <Animated.View
                pointerEvents="none"
                style={{ opacity: likeOpacity }}
                className="absolute inset-0 items-center justify-center bg-emerald-500/20 z-40"
              >
                <View className="rounded-full border-4 border-emerald-400 p-8 bg-emerald-900/60 shadow-xl">
                  <Ionicons name="heart" size={100} color="#34d399" />
                </View>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={{ opacity: dislikeOpacity }}
                className="absolute inset-0 items-center justify-center bg-red-500/20 z-40"
              >
                <View className="rounded-full border-4 border-red-400 p-8 bg-red-900/60 shadow-xl">
                  <Ionicons name="close" size={100} color="#f87171" />
                </View>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={{ opacity: opacityY }}
                className="absolute inset-0 items-center justify-center bg-amber-400/20 z-40"
              >
                <View className="rounded-full border-4 border-amber-400 p-8 bg-amber-400/40 shadow-xl">
                  <Ionicons name="star" size={100} color="#fbbf24" />
                </View>
              </Animated.View>
            </>
          )}

          {/* Bottom Info Overlay */}
          <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/100 via-black/60 to-transparent pt-20">
            <View className="flex-row items-end flex-wrap mb-2">
              <Text className="text-4xl font-black text-white tracking-tight mr-3">
                {item.title}
              </Text>
              <Text className="text-2xl font-medium text-white/80 mb-1">
                {item.year}
              </Text>
            </View>

            <View className="flex-row items-center mb-4">
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

            <Text
              className="text-base leading-snug text-white/90 font-medium mb-4"
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row flex-wrap flex-1">
                {item.genres.slice(0, 3).map((genre) => (
                  <View
                    key={genre}
                    className="bg-white/10 px-3 py-1 rounded-lg mr-2 mb-2 border border-white/5"
                  >
                    <Text className="text-[11px] font-semibold text-white/80">
                      {genre}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => setIsModalVisible(true)}
                className="h-8 w-8 rounded-full bg-white/20 items-center justify-center border border-white/10"
              >
                <Ionicons name="information-outline" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <MediaDetailModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        item={item}
      />
    </Animated.View>
  )
}