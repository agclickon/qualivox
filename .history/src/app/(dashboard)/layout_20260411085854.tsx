"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { PlanUsageBanner } from "@/components/plan-usage-banner"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading, fetchUser } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  const currentSidebarWidth = sidebarCollapsed ? "72px" : "var(--sidebar-width)"
  const contentStyle = {
    "--sidebar-current-width": currentSidebarWidth,
  } as CSSProperties & Record<"--sidebar-current-width", string>

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="flex flex-1 flex-col min-w-0" style={contentStyle}>
        <PlanUsageBanner />
        <Header onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 md:p-6" style={{ marginTop: "var(--header-height)" }}
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}
