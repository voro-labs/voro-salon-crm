import React, { useRef, useEffect } from "react"
import { View, TouchableOpacity, ScrollView, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function ScrollableTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)

  // Rola para deixar a tab ativa visível
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: state.index * 64, animated: true })
  }, [state.index])

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, borderTopColor: "#f4f4f5" },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const isFocused = state.index === index

          // Respeita tabs ocultas (href: null) — só esconde se não tiver label explícito
          if ((options as any).href === null && !options.tabBarLabel) return null

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
              ? options.title
              : // Fallback robusto: extrai o segmento base do route.name
                (() => {
                  const segs = route.name.split("/").filter((s) => !s.startsWith("(") && s !== "index" && s !== "")
                  return segs.length > 0 ? segs[segs.length - 1] : route.name
                })()

          const color = isFocused
            ? (options.tabBarActiveTintColor as string) ?? "#000"
            : (options.tabBarInactiveTintColor as string) ?? "#9ca3af"

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params)
            }
          }

          const itemStyle = (options as any).tabBarItemStyle

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={[styles.tab, isFocused && styles.tabActive, itemStyle]}
            >
              {options.tabBarIcon?.({ focused: isFocused, color })}
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
              {isFocused && <View style={[styles.indicator, { backgroundColor: color }]} />}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 14,
    minWidth: 64,
    position: "relative",
  },
  tabActive: {},
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  indicator: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
