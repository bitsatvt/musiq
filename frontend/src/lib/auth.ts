"use client"

import { useEffect, useState } from "react"
import type { Instrument } from "@/lib/api"

const AUTH_TOKEN_KEY = "authToken"
const AUTH_USER_KEY = "authUser"

export type AuthUser = {
  user_id: number
  username: string
  email: string
  instruments: Instrument[]
}

/* Read the current auth token from localStorage for authenticated requests. */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/* Save the login token and optional user profile in localStorage after login/signup. */
export function setAuthSession(token: string, user?: AuthUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  }
}

/* Clear all stored auth session data during logout. */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

/* Read and safely parse the stored user profile; return null if missing/invalid. */
export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null

  try {
    const user = JSON.parse(raw) as AuthUser
    // Older sessions have no instrument list; signup/login supply the current list.
    return { ...user, instruments: Array.isArray(user.instruments) ? user.instruments : [] }
  } 
  catch {
    return null
  }
}

/* Read the current auth user into React state for client components. */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(getAuthUser())

    function handleStorage(event: StorageEvent) {
      if (event.key === AUTH_USER_KEY || event.key === null) {
        setUser(getAuthUser())
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  return user
}
