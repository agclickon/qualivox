"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, BellRing, CheckCheck, Loader2, UserPlus, MessageSquare, Target, AlertTriangle, Settings, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: string | null
  isRead: boolean
  createdAt: string
}

const typeIcons: Record<string, React.ReactNode> = {
  novo_lead: <UserPlus className="h-4 w-4 text-blue-500" />,
  mensagem_recebida: <MessageSquare className="h-4 w-4 text-green-500" />,
  lead_atribuido: <Target className="h-4 w-4 text-purple-500" />,
  follow_up: <Clock className="h-4 w-4 text-orange-500" />,
  meta_atingida: <Target className="h-4 w-4 text-emerald-500" />,
  sistema: <Settings className="h-4 w-4 text-gray-500" />,
  lembrete: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications")
        const data = await res.json()
        if (data.success) {
          setNotifications(data.data.notifications)
          setUnreadCount(data.data.unreadCount)
        }
      } catch (err) {
        console.error("Erro ao carregar notificações:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Erro ao marcar como lidas:", err)
    }
  }

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Erro:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-44 mb-2" /><Skeleton className="h-4 w-56" /></div>
          <Skeleton className="h-10 w-52" />
        </div>
        <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent className="space-y-2">
          {[...Array(6)].map((_, i) => (<div key={i} className="flex items-start gap-3 rounded-lg border p-3"><Skeleton className="h-5 w-5 rounded mt-0.5" /><div className="flex-1"><Skeleton className="h-4 w-44 mb-1" /><Skeleton className="h-3 w-64" /></div><Skeleton className="h-3 w-16" /></div>))}
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h3 font-bold" data-testid="heading-notificacoes">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as suas notificações
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Todas as Notificações
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unreadCount}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Nenhuma notificação</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                    !notif.isRead ? "bg-primary/5 border-primary/20" : ""
                  }`}
                  onClick={() => !notif.isRead && markOneRead(notif.id)}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {typeIcons[notif.type] || <Bell className="h-4 w-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.isRead ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                      {!notif.isRead && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{formatDate(notif.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
