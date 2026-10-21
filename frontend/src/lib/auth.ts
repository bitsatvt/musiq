"use client"

import { useMemo, useSyncExternalStore } from "react"
import type { Instrument } from "@/lib/api"

const AUTH_TOKEN_KEY = "authToken"
const AUTH_USER_KEY = "authUser"
const AUTH_CHANGE_EVENT = "auth-session-changed"

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

/* Save login/signup data and notify components in the current tab. */
export function setAuthSession(token: string, user?: AuthUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

/* Update the cached profile and notify components, keeping the login token. */
export function updateAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

/* Clear the saved session and notify components that the user logged out. */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
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

/* Listen for account changes in this tab and other tabs; return listener cleanup. */
function subscribeToAuth(onChange: () => void) {
  // Ignore storage changes unrelated to the account.
  function handleStorage(event: StorageEvent) {
    if (event.key === AUTH_USER_KEY || event.key === AUTH_TOKEN_KEY || event.key === null) {
      onChange()
    }
  }
  window.addEventListener("storage", handleStorage)
  window.addEventListener(AUTH_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange)
  }
}

/* Return the stored JSON string so React can detect when the profile changes. */
function getUserSnapshot() {
  return localStorage.getItem(AUTH_USER_KEY)
}

/* Return the current user and refresh subscribed components when storage changes. */
export function useAuthUser() {
  // Browser storage is unavailable during server rendering, so use a null snapshot.
  const raw = useSyncExternalStore(subscribeToAuth, getUserSnapshot, () => null)
  // Parse the profile again only when its stored JSON changes.
  return useMemo(() => {
    if (!raw) return null
    try {
      const user = JSON.parse(raw) as AuthUser
      return { ...user, instruments: Array.isArray(user.instruments) ? user.instruments : [] }
    } catch {
      return null
    }
  }, [raw])
}
