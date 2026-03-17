import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import * as SecureStore from 'expo-secure-store'

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/v1`
const STORAGE_KEY = "voro-auth-session"

export interface User {
  id: string
  userName: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (data: any) => Promise<void>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (data: any) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    loadSession()
  }, [])

  const loadSession = async () => {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEY)
      if (saved) {
        const { user, token } = JSON.parse(saved)
        console.log(user);
        setState(prev => ({ ...prev, user, token, isAuthenticated: true, isLoading: false }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (e) {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const persistSession = async (user: User, token: string) => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ user, token }))
  }

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${BASE_URL}/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email, Password: password }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to sign in")

      const data = json.data
      const user: User = {
        id: data.userId,
        userName: data.userName,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      }
      const token = data.token

      await persistSession(user, token)
      setState({ user, token, isAuthenticated: true, isLoading: false, error: null })
    } catch (e: any) {
      setState(prev => ({ ...prev, isLoading: false, error: e.message }))
      throw e
    }
  }

  const signUp = async (data: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${BASE_URL}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to sign up")

      const authData = json.data
      const user: User = {
        id: authData.userId,
        userName: authData.userName,
        email: authData.email,
        firstName: authData.firstName,
        lastName: authData.lastName,
      }
      const token = authData.token

      await persistSession(user, token)
      setState({ user, token, isAuthenticated: true, isLoading: false, error: null })
    } catch (e: any) {
      setState(prev => ({ ...prev, isLoading: false, error: e.message }))
      throw e
    }
  }

  const forgotPassword = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email }),
      })
      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.message || "Failed to request reset")
      }
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (e: any) {
      setState(prev => ({ ...prev, isLoading: false, error: e.message }))
      throw e
    }
  }

  const resetPassword = async (data: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.message || "Failed to reset password")
      }
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (e: any) {
      setState(prev => ({ ...prev, isLoading: false, error: e.message }))
      throw e
    }
  }

  const signOut = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY)
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
  }

  const clearError = () => setState(prev => ({ ...prev, error: null }))

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, forgotPassword, resetPassword, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
