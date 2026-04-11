"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  kanban: "Kanban",
  whatsapp: "WhatsApp",
  chat: "Chat Interno",
  automacoes: "Automações",
  relatorios: "Relatórios",
  notificacoes: "Notificações",
  equipe: "Equipe",
  templates: "Templates",
  configuracoes: "Configurações",
  perfil: "Perfil",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((seg, i) => ({
    label: routeLabels[seg] || seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
