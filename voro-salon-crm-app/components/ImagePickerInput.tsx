import React, { useState } from "react"
import { View, Text, Pressable, Image, ActivityIndicator, Alert, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useTenantTheme } from "contexts/tenant-theme.context"

export interface LocalImageFile {
  uri: string
  name: string
  type: string
}

interface ImagePickerInputProps {
  /** The current visual representation (URL or local base64/uri) */
  value: string | null | undefined
  /** Triggered when the user picks a new image. Sends the file metadata. */
  onChange: (file: LocalImageFile) => void
  /** If true, shows a spinner over the image. */
  isUploading?: boolean
  /** Text shown below or beside the image */
  label?: string
  /** The placeholder icon to show if no image */
  fallbackIcon?: React.ComponentProps<typeof Ionicons>["name"]
  /** Defaults to full (circle) */
  rounded?: "full" | "2xl" | "3xl" | "xl"
  /** Size of the square/circle block. Default: 80 */
  size?: number
}

export function ImagePickerInput({
  value,
  onChange,
  isUploading = false,
  label = "Trocar foto",
  fallbackIcon = "camera-outline",
  rounded = "full",
  size = 80,
}: ImagePickerInputProps) {
  const { primaryColor } = useTenantTheme()
  const [pickerModalOpen, setPickerModalOpen] = useState(false)

  const pickImage = async () => {
    // Solicita permissão da galeria
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua galeria para escolher uma foto.")
      return
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Permite recorte natural do OS
      aspect: [1, 1], // Quadrado natural (útil pra perfil/logo)
      quality: 0.8, // 80% pra ficar leve mas sem perder mta resolução
    })

    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0]
      // Extrair extensão correta ou assumir jpg
      const uriParts = asset.uri.split(".")
      const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1] : "jpg"
      // Criar o nome do arquivo pra usar no FormData backend
      const name = asset.fileName || `upload_${Date.now()}.${ext}`
      const type = asset.mimeType || `image/${ext === "jpg" ? "jpeg" : ext}`

      onChange({ uri: asset.uri, name, type })
    }
  }

  const takePhoto = async () => {
    setPickerModalOpen(false)
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à sua câmera.")
      return
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!res.canceled && res.assets && res.assets.length > 0) {
      const asset = res.assets[0]
      onChange({ uri: asset.uri, name: `camera_${Date.now()}.jpg`, type: "image/jpeg" })
    }
  }

  const handlePress = () => {
    if (isUploading) return
    setPickerModalOpen(true)
  }

  return (
    <>
    <Modal visible={pickerModalOpen} transparent animationType="slide" onRequestClose={() => setPickerModalOpen(false)}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setPickerModalOpen(false)}>
        <Pressable className="bg-white rounded-t-3xl px-6 pt-6 pb-10 gap-3" onPress={() => {}}>
          <Text className="text-zinc-900 font-black text-base text-center mb-2">Escolher foto</Text>
          <Pressable
            onPress={() => { setPickerModalOpen(false); setTimeout(pickImage, 300) }}
            className="flex-row items-center gap-3 h-14 bg-zinc-50 rounded-2xl px-4 border border-zinc-100"
          >
            <Ionicons name="images-outline" size={22} color="#3f3f46" />
            <Text className="text-zinc-800 font-bold text-base">Escolher da Galeria</Text>
          </Pressable>
          <Pressable
            onPress={takePhoto}
            className="flex-row items-center gap-3 h-14 bg-zinc-50 rounded-2xl px-4 border border-zinc-100"
          >
            <Ionicons name="camera-outline" size={22} color="#3f3f46" />
            <Text className="text-zinc-800 font-bold text-base">Tirar Foto</Text>
          </Pressable>
          <Pressable
            onPress={() => setPickerModalOpen(false)}
            className="h-12 rounded-2xl items-center justify-center border border-zinc-200 mt-1"
          >
            <Text className="text-zinc-500 font-bold text-base">Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    <View className="flex-row items-center gap-4">
      <Pressable
        onPress={handlePress}
        className={`bg-zinc-100 border-2 items-center justify-center overflow-hidden w-[${size}px] h-[${size}px] rounded-${rounded}`}
        style={{
          width: size,
          height: size,
          borderColor: value ? primaryColor : "#e4e4e7",
          backgroundColor: value ? "white" : "#f4f4f5",
        }}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name={fallbackIcon} size={size * 0.4} color="#a1a1aa" />
        )}

        {isUploading && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center">
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </Pressable>

      <View className="flex-1 justify-center">
        <Pressable onPress={handlePress} disabled={isUploading} className="self-start py-2">
          <Text className="text-sm font-bold" style={{ color: primaryColor }}>
            {label}
          </Text>
        </Pressable>
        {!value && (
          <Text className="text-xs text-zinc-400 font-medium leading-relaxed max-w-[90%]">
            Recomendado proporção 1:1. JPG, PNG ou JPEG.
          </Text>
        )}
      </View>
    </View>
    </>
  )
}
