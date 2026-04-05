import React from "react"
import { Modal, View, Text, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface Props {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={onCancel}>
        <Pressable className="bg-white rounded-3xl w-full p-6 gap-4" onPress={() => {}}>
          <View className="items-center gap-3">
            <View
              className={`h-14 w-14 rounded-full items-center justify-center ${
                destructive ? "bg-red-100" : "bg-zinc-100"
              }`}
            >
              <Ionicons
                name={destructive ? "trash-outline" : "help-circle-outline"}
                size={28}
                color={destructive ? "#ef4444" : "#71717a"}
              />
            </View>
            <Text className="text-zinc-900 font-black text-lg text-center">{title}</Text>
            <Text className="text-zinc-500 font-medium text-sm text-center leading-5">{message}</Text>
          </View>
          <View className="gap-2 mt-2">
            <Pressable
              onPress={onConfirm}
              className={`h-12 rounded-2xl items-center justify-center ${
                destructive ? "bg-red-500" : "bg-zinc-900"
              }`}
            >
              <Text className="text-white font-bold text-base">{confirmLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              className="h-12 rounded-2xl items-center justify-center border border-zinc-200"
            >
              <Text className="text-zinc-700 font-bold text-base">{cancelLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
