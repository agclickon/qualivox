"use client"

import { create } from "zustand"
import type { AuthUser } from "@/types"

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: { companyName: string; cnpj: string; responsibleName: string; name: string; email: string; phone: string; password: string; confirmPassword: string; acceptTerms: boolean }) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro ao fazer login")
    }

    set({ user: data.data.user, isAuthenticated: true })
  },

  register: async (formData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro ao criar conta")
    }

    // Conta criada mas desabilitada - não autentica automaticamente
    return data.data
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    set({ user: null, isAuthenticated: false })
    window.location.href = "/login"
  },

  fetchUser: async () => {
    try {
      set({ isLoading: true })
      const res = await fetch("/api/auth/me", { cache: "no-store" })

      if (res.ok) {
        const data = await res.json()
        set({ user: data.data.user, isAuthenticated: true, isLoading: false })
      } else {
        // Tentar renovar o token
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" })
        if (refreshRes.ok) {
          const meRes = await fetch("/api/auth/me", { cache: "no-store" })
          if (meRes.ok) {
            const data = await meRes.json()
            set({ user: data.data.user, isAuthenticated: true, isLoading: false })
            return
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
