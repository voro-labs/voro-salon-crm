import * as SecureStore from "expo-secure-store"
import { DeviceEventEmitter } from "react-native"
import { TokenAdapter } from "./auth-token-manager"

export class MobileTokenAdapter implements TokenAdapter {
  private logoutEventEmitted = false

  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("vorolabs_salon_token")
  }

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("vorolabs_salon_refresh_token")
  }

  async saveTokens(token: string, refreshToken?: string): Promise<void> {
    await SecureStore.setItemAsync("vorolabs_salon_token", token)
    if (refreshToken) {
      await SecureStore.setItemAsync("vorolabs_salon_refresh_token", refreshToken)
    }
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync("vorolabs_salon_token")
    await SecureStore.deleteItemAsync("vorolabs_salon_refresh_token")
  }

  onLogout(): void {
    if (!this.logoutEventEmitted) {
      this.logoutEventEmitted = true
      DeviceEventEmitter.emit("auth:logout")
    }
  }
}
