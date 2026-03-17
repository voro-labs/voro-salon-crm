import React, { useState } from "react"
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from "react-native"
import { useAuth } from "../../lib/use-auth-store"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"

export function ResetPasswordScreen({ navigation, route }: any) {
    const { resetPassword, isLoading, error, clearError } = useAuth()
    const initialEmail = route.params?.email || ""

    const [form, setForm] = useState({
        Email: initialEmail,
        Token: "",
        NewPassword: "",
        ConfirmPassword: "",
    })

    const updateForm = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }))
        clearError()
    }

    const handleReset = async () => {
        if (!form.Token || !form.NewPassword || !form.ConfirmPassword) return
        if (form.NewPassword !== form.ConfirmPassword) {
            // Could set a local error here, but store handles matching if API does
            return
        }

        try {
            await resetPassword(form)
            navigation.navigate("SignIn")
        } catch (e) {
            // Error handled by store
        }
    }

    const InputField = ({ icon, placeholder, value, onChangeText, ...props }: any) => (
        <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 flex-row items-center mb-4">
            <Ionicons name={icon} size={20} color="#71717a" />
            <TextInput
                className="flex-1 ml-3 text-zinc-900 font-semibold text-base py-0"
                placeholder={placeholder}
                placeholderTextColor="#a1a1aa"
                value={value}
                onChangeText={onChangeText}
                textAlignVertical="center"
                {...props}
            />
        </View>
    )

    return (
        <SafeAreaView className="flex-1 bg-zinc-50">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    {/* Header & Main Card */}
                    <View className="bg-white px-8 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
                        <Pressable
                            onPress={() => navigation.goBack()}
                            className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl items-center justify-center mb-6"
                        >
                            <Ionicons name="chevron-back" size={20} color="#18181b" />
                        </Pressable>

                        <View className="items-center mb-10">
                            <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
                                <Ionicons name="lock-open-outline" size={40} color="white" />
                            </View>
                            <Text className="text-3xl font-black text-zinc-900 mt-6 tracking-tighter text-center">
                                Nova<Text className="text-purple-600"> Senha</Text>
                            </Text>
                            <Text className="text-zinc-500 mt-2 font-medium text-center">
                                Crie uma nova senha segura para sua conta
                            </Text>
                        </View>

                        <View className="space-y-1">
                            <InputField
                                icon="key-outline"
                                placeholder="Código Token"
                                autoCapitalize="none"
                                value={form.Token}
                                onChangeText={(v: string) => updateForm("Token", v)}
                            />

                            <InputField
                                icon="lock-closed-outline"
                                placeholder="Nova Senha"
                                secureTextEntry
                                value={form.NewPassword}
                                onChangeText={(v: string) => updateForm("NewPassword", v)}
                            />

                            <InputField
                                icon="shield-checkmark-outline"
                                placeholder="Confirmar Senha"
                                secureTextEntry
                                value={form.ConfirmPassword}
                                onChangeText={(v: string) => updateForm("ConfirmPassword", v)}
                            />

                            {form.NewPassword !== form.ConfirmPassword && form.ConfirmPassword !== "" && (
                                <Text className="text-red-500 text-xs font-bold ml-1 mb-2">As senhas não coincidem</Text>
                            )}

                            {error && (
                                <View className="bg-red-50 p-4 rounded-2xl flex-row items-center border border-red-100 mt-2">
                                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                                    <Text className="ml-3 text-red-600 text-sm font-bold flex-1">{error}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View className="px-8 mt-10 pb-12">
                        <Pressable
                            onPress={handleReset}
                            disabled={isLoading || form.NewPassword !== form.ConfirmPassword}
                            className={`h-16 rounded-2xl items-center justify-center shadow-lg ${isLoading || (form.NewPassword !== form.ConfirmPassword && form.ConfirmPassword !== "")
                                ? "bg-purple-400"
                                : "bg-purple-600 shadow-purple-200"
                                }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <View className="flex-row items-center">
                                    <Text className="text-white text-lg font-black mr-2">Resetar Senha</Text>
                                    <Ionicons name="checkmark-done" size={20} color="white" />
                                </View>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
