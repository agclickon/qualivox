"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Kanban,
  MessageSquare,
  Bot,
  BarChart3,
  Bell,
  Settings,
  Workflow,
  FileText,
  X,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import { getInitials } from "@/lib/utils"
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/app-info"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/kanban", label: "Kanban", icon: Kanban },
  { href: "/whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
  { href: "/agentes", label: "Agentes IA", icon: BrainCircuit },
  { href: "/chat", label: "Chat Interno", icon: MessageSquare },
  { href: "/automacoes", label: "Automações", icon: Workflow },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

const adminOnlyItems = ["/equipe", "/configuracoes"]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ mobileOpen, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)

  const filteredItems = menuItems.filter((item) => {
    if (adminOnlyItems.includes(item.href)) {
      return user?.role === "super_admin" || user?.role === "admin"
    }
    return true
  })

  const renderSidebarContent = (isCollapsed: boolean, showCloseButton = false) => (
    <>
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b px-4", isCollapsed ? "justify-center" : "justify-between")}
        >
        <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold leading-none">{APP_NAME}</h1>
              <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
            </div>
          )}
        </div>
        {showCloseButton && onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-2" : "p-3")}
      >
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  data-testid={`link-${item.href.replace("/", "")}`}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Usuário */}
      <div className={cn("border-t space-y-2", isCollapsed ? "p-2" : "p-3")}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "Avatar"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : user?.name ? (
                getInitials(user.name)
              ) : (
                "?"
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{APP_VERSION}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
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
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{user?.name || "Usuário"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground text-left">
              {APP_NAME} · {APP_VERSION}
            </div>
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex h-screen flex-col border-r bg-card relative sticky top-0 z-40"
        style={{ width: collapsed ? "72px" : "var(--sidebar-width)" }}
      >
        {renderSidebarContent(collapsed)}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-6 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r bg-card shadow-xl">
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}
    </>
  )
}
