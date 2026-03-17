import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
} from "react-native"

const { width } = Dimensions.get("window")
import { Ionicons } from "@expo/vector-icons"
import { MediaItem } from "lib/types"
import { SwipeCard } from "./SwipeCard"

interface SwipeStackProps {
  items: MediaItem[]
  onLike: (item: MediaItem) => void
  onDislike: (item: MediaItem) => void
  onSuperLike: (item: MediaItem) => void
  onUndo: () => void
  canUndo: boolean
}

export function SwipeStack({
  items,
  onLike,
  onDislike,
  onSuperLike,
  onUndo,
  canUndo,
}: SwipeStackProps) {
  const [superLikeFlash, setSuperLikeFlash] = useState(false)
  const flashOpacity = useRef(new Animated.Value(0)).current
  const dragPosition = useRef(new Animated.ValueXY()).current

  const handleSuperLike = useCallback(
    (item: MediaItem) => {
      setSuperLikeFlash(true)
      onSuperLike(item)
    },
    [onSuperLike]
  )

  const handleButtonLike = useCallback(() => {
    if (!items.length) return
    onLike(items[0])
  }, [items, onLike])

  const handleButtonDislike = useCallback(() => {
    if (!items.length) return
    onDislike(items[0])
  }, [items, onDislike])

  const handleButtonSuperLike = useCallback(() => {
    if (!items.length) return
    handleSuperLike(items[0])
  }, [items, handleSuperLike])

  useEffect(() => {
    if (superLikeFlash) {
      flashOpacity.setValue(0.6)
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setSuperLikeFlash(false))
    }
  }, [superLikeFlash, flashOpacity])

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center">
          <View className="mb-4 h-20 w-20 rounded-full bg-secondary items-center justify-center">
            <Ionicons name="heart" size={40} color="#ec4899" />
          </View>

          <Text className="text-xl font-semibold text-foreground">
            No more items
          </Text>

          <Text className="mt-2 text-sm text-muted-foreground text-center">
            You've seen everything. Try adjusting your filters.
          </Text>

          {canUndo && (
            <Pressable
              onPress={onUndo}
              className="mt-4 flex-row items-center px-4 py-2 rounded-full bg-muted"
            >
              <Ionicons name="arrow-back" size={16} color="#374151" />
              <Text className="text-sm font-medium text-foreground">
                Undo last swipe
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    )
  }

  const visibleCards = items.slice(0, 3)

  const nextCardScale = dragPosition.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  })

  const nextCardTranslateY = dragPosition.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [0, 14, 0],
    extrapolate: "clamp",
  })

  return (
    <View className="flex-1 items-center justify-center relative">
      {superLikeFlash && (
        <Animated.View
          pointerEvents="none"
          style={{ opacity: flashOpacity }}
          className="absolute inset-0 z-50 items-center justify-center bg-amber-400/10"
        >
          <Ionicons name="star" size={120} color="#fbbf24" />
        </Animated.View>
      )}

      <View className="w-full h-full items-center justify-center">
        <View
          className="relative w-full max-w-sm"
          style={{ height: 560 }}
        >
          {visibleCards.map((item, index) => {
            const isTop = index === 0
            const isNext = index === 1

            // Base styles for stack
            let scale: any = 1 - index * 0.05
            let translateY: any = index * 14

            // Top card tracking
            if (isNext) {
              scale = nextCardScale
              translateY = nextCardTranslateY
            }

            return (
              <SwipeCard
                key={item.id}
                item={item}
                isTop={isTop}
                onSwipeLeft={() => onDislike(item)}
                onSwipeRight={() => onLike(item)}
                onSwipeUp={() => handleSuperLike(item)}
                onDrag={isTop ? (pos) => dragPosition.setValue(pos) : undefined}
                style={{
                  zIndex: visibleCards.length - index,
                  transform: [
                    { scale },
                    { translateY },
                  ],
                  opacity: index > 1 ? 0.6 : 1,
                }}
              />
            )
          })}
        </View>

        <View className="flex-row items-center justify-center mt-6 space-x-6 gap-2">
          <Pressable
            onPress={handleButtonDislike}
            className="h-14 w-14 rounded-full bg-red-500 items-center justify-center"
          >
            <Text className="text-white text-lg">✕</Text>
          </Pressable>

          <Pressable
            onPress={handleButtonSuperLike}
            className="h-14 w-14 rounded-full bg-amber-400 items-center justify-center"
          >
            <Ionicons name="star" size={24} color="#fff" />
          </Pressable>

          <Pressable
            onPress={handleButtonLike}
            className="h-14 w-14 rounded-full bg-emerald-500 items-center justify-center"
          >
            <Ionicons name="heart" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}