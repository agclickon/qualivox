import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"

// GET /api/chat?channel=geral - Listar mensagens de um canal
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      )
    }
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Token inválido" } },
        { status: 401 }
      )
    }

    const channel = request.nextUrl.searchParams.get("channel") || "geral"

    const messages = await prisma.chatMessage.findMany({
      where: { channel },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      take: 200,
    })

    return NextResponse.json({ success: true, data: { messages } })
  } catch (error) {
    console.error("Erro ao listar mensagens do chat:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/chat - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("access_token")?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autorizado" } },
        { status: 401 }
      )
    }
    const payload = await verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Token inválido" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, channel } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Conteúdo é obrigatório" } },
        { status: 400 }
      )
    }

    const message = await prisma.chatMessage.create({
      data: {
        senderId: payload.userId,
        content: content.trim(),
        channel: channel || "geral",
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
