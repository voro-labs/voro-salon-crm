import { Stack } from "expo-router"

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="change-password" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  )
}
