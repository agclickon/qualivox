"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, fetchUser } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col md:ml-[var(--sidebar-width)]">
        <Header onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 md:p-6" style={{ marginTop: "var(--header-height)" }}>
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}
