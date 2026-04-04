import React, { useState } from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTenantTheme } from "contexts/tenant-theme.context"

interface RatingModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (stars: number, comment?: string) => void
  clientName: string
  isLoading: boolean
}

export function RatingModal({ visible, onClose, onSubmit, clientName, isLoading }: RatingModalProps) {
  const { primaryColor } = useTenantTheme()
  const [selectedStars, setSelectedStars] = useState(0)
  const [comment, setComment] = useState("")

  function handleClose() {
    setSelectedStars(0)
    setComment("")
    onClose()
  }

  function handleSubmit() {
    if (selectedStars === 0) return
    onSubmit(selectedStars, comment.trim() || undefined)
    setSelectedStars(0)
    setComment("")
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}
          onPress={handleClose}
        >
          <Pressable
            style={{ backgroundColor: "white", borderRadius: 24, width: "100%", overflow: "hidden" }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f4f4f5", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ height: 40, width: 40, borderRadius: 12, backgroundColor: "#fef9c3", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="star" size={20} color="#ca8a04" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "900", color: "#18181b" }}>Avaliar cliente</Text>
                <Text style={{ fontSize: 13, color: "#71717a", marginTop: 1 }} numberOfLines={1}>
                  {clientName}
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                style={{ height: 32, width: 32, borderRadius: 8, backgroundColor: "#f4f4f5", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={16} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, gap: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Stars */}
              <View style={{ alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#71717a", textAlign: "center" }}>
                  Como foi o atendimento?
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setSelectedStars(star)}
                      style={({ pressed }) => ({
                        height: 52,
                        width: 52,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: star <= selectedStars ? "#fef9c3" : "#f4f4f5",
                        borderWidth: 2,
                        borderColor: star <= selectedStars ? "#fde047" : "transparent",
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Ionicons
                        name={star <= selectedStars ? "star" : "star-outline"}
                        size={26}
                        color={star <= selectedStars ? "#ca8a04" : "#a1a1aa"}
                      />
                    </Pressable>
                  ))}
                </View>
                {selectedStars > 0 && (
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#ca8a04", marginTop: 2 }}>
                    {STAR_LABELS[selectedStars]}
                  </Text>
                )}
              </View>

              {/* Comment */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#71717a" }}>
                  Comentário <Text style={{ fontWeight: "400" }}>(opcional)</Text>
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Adicione uma observação sobre o atendimento..."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: "#f9f9f9",
                    borderWidth: 1,
                    borderColor: "#e4e4e7",
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    paddingBottom: 12,
                    fontSize: 14,
                    color: "#18181b",
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  maxLength={500}
                />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 50,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f4f4f5",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#52525b" }}>Pular</Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmit}
                  disabled={selectedStars === 0 || isLoading}
                  style={({ pressed }) => ({
                    flex: 2,
                    height: 50,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: selectedStars === 0 ? "#e4e4e7" : primaryColor,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="star" size={16} color={selectedStars === 0 ? "#a1a1aa" : "white"} />
                      <Text style={{ fontSize: 14, fontWeight: "900", color: selectedStars === 0 ? "#a1a1aa" : "white" }}>
                        Enviar Avaliacao
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const STAR_LABELS: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente!",
}
