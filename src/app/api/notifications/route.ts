import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/notifications - Listar notificações do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = { userId }
    if (unreadOnly) where.isRead = false

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    })
  } catch (error) {
    console.error("Erro ao listar notificações:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Marcar notificações como lidas
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationIds, markAll } = body

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar notificações:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
