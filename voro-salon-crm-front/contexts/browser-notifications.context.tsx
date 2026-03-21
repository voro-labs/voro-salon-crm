"use client"

import { createContext, useContext, useCallback, useRef, type ReactNode } from "react"

interface NotifyOptions {
  body?: string
  icon?: string
  tag?: string
  silent?: boolean
}

interface BrowserNotificationsContextType {
  requestPermission: () => Promise<void>
  notify: (title: string, options?: NotifyOptions) => void
  isSupported: () => boolean
}

const BrowserNotificationsContext = createContext<BrowserNotificationsContextType | undefined>(undefined)

export function BrowserNotificationsProvider({ children }: { children: ReactNode }) {
  const permissionRef = useRef<NotificationPermission | null>(null)

  const isSupported = useCallback(() => {
    return typeof window !== "undefined" && "Notification" in window
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported()) return

    const current = Notification.permission
    permissionRef.current = current

    if (current === "default") {
      const result = await Notification.requestPermission()
      permissionRef.current = result
    }
  }, [isSupported])

  const notify = useCallback((title: string, options?: NotifyOptions) => {
    if (!isSupported()) return

    const permission = permissionRef.current ?? Notification.permission
    if (permission !== "granted") return

    try {
      new Notification(title, {
        body: options?.body,
        icon: options?.icon ?? "/icon.ico",
        tag: options?.tag,
        silent: options?.silent ?? false,
      })
    } catch {
      // Mobile Chrome (Android) não suporta new Notification() diretamente
      // Requer ServiceWorkerRegistration.showNotification()
    }
  }, [isSupported])

  return (
    <BrowserNotificationsContext.Provider value={{ requestPermission, notify, isSupported }}>
      {children}
    </BrowserNotificationsContext.Provider>
  )
}

export function useBrowserNotifications() {
  const context = useContext(BrowserNotificationsContext)
  if (!context) {
    throw new Error("useBrowserNotifications must be used within a BrowserNotificationsProvider")
  }
  return context
}
