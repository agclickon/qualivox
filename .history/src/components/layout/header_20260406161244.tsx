"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Sun, Moon, Bell, LogOut, User, Settings, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth-store"
import { getInitials } from "@/lib/utils"
import { useState, useRef, useEffect, useCallback } from "react"

interface HeaderProps {
  onToggleSidebar?: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (data.success) {
        const unread = data.data.notifications.filter((n: { isRead: boolean }) => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  return (
    <header
      className="fixed left-0 md:left-[var(--sidebar-current-width)] right-0 top-0 z-30 flex items-center justify-between border-b bg-card px-4 md:px-6"
      style={{
        height: "var(--header-height)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
          data-testid="button-menu-toggle"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          Olá, {user?.name?.split(" ")[0] || "Usuário"}!
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle Tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="toggle-theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notificações com badge */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push("/notificacoes")}
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity overflow-hidden"
            data-testid="button-avatar"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || "Avatar"}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            ) : user?.name ? (
              getInitials(user.name)
            ) : (
              "?"
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border bg-card p-1 shadow-lg">
              <div className="border-b px-3 py-2 mb-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  router.push("/perfil")
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                data-testid="dropdown-profile"
              >
                <User className="h-4 w-4" />
                Perfil
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  router.push("/configuracoes")
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                data-testid="dropdown-settings"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </button>
              <div className="border-t mt-1 pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  data-testid="dropdown-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
