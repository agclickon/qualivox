import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const agents = await (prisma.agent as any).findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { knowledgeFiles: true } },
      },
    })

    // Enriquece com avatar_url via raw (compatível com client desatualizado)
    const avatars = await prisma.$queryRaw<{ id: string; avatar_url: string | null }[]>`
      SELECT id, avatar_url FROM agents
    `
    const avatarMap = Object.fromEntries(avatars.map((a) => [a.id, a.avatar_url]))
    const enriched = agents.map((a: any) => ({ ...a, avatarUrl: avatarMap[a.id] ?? null }))

    return NextResponse.json({ success: true, data: { agents: enriched } })
  } catch (error) {
    console.error("Erro ao listar agentes:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userRole = req.headers.get("x-user-role")
  const userId = req.headers.get("x-user-id")

  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      name,
      description,
      systemPrompt,
      tone = "profissional",
      mode = "assisted",
      provider,
      model,
      temperature = 0.3,
      maxTokens = 1500,
      escalateThreshold = -30,
      connectionIds = [],
      isActive = true,
      voiceEnabled = false,
      voiceMode = "if_audio",
      voiceId,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Nome é obrigatório" }, { status: 400 })
    }

    const agent = await (prisma.agent as any).create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        systemPrompt: systemPrompt?.trim() || "",
        tone,
        mode,
        provider: provider || null,
        model: model || null,
        temperature,
        maxTokens,
        escalateThreshold,
        connectionIds: JSON.stringify(connectionIds),
        isActive,
        voiceEnabled,
        voiceMode,
        voiceId: voiceId || null,
        createdById: userId || null,
      },
    })

    return NextResponse.json({ success: true, data: { agent } }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
