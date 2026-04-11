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

    // Enriquece com avatar_url e voice settings via raw (compatível com client desatualizado)
    const extraFields = await prisma.$queryRaw<{
      id: string
      avatar_url: string | null
      voice_enabled: number | null
      voice_mode: string | null
      voice_id: string | null
      voice_speed: number | null
      voice_stability: number | null
      voice_similarity: number | null
      typing_delay: number | null
      typing_delay_max: number | null
      mark_as_read: number | null
      split_messages: number | null
      learning_policy: string | null
    }[]>`
      SELECT id, avatar_url, voice_enabled, voice_mode, voice_id, voice_speed, voice_stability, voice_similarity, typing_delay, typing_delay_max, mark_as_read, split_messages, learning_policy FROM agents
    `
    const extraMap = Object.fromEntries(extraFields.map((a) => [a.id, a]))
    const enriched = agents.map((a: any) => {
      const extra = extraMap[a.id] || {}
      return {
        ...a,
        avatarUrl: extra.avatar_url ?? null,
        voiceEnabled: Boolean(extra.voice_enabled),
        voiceMode: extra.voice_mode ?? "if_audio",
        voiceId: extra.voice_id ?? null,
        voiceSpeed: extra.voice_speed ?? 1.0,
        voiceStability: extra.voice_stability ?? 0.5,
        voiceSimilarity: extra.voice_similarity ?? 0.75,
        typingDelay: Boolean(extra.typing_delay),
        typingDelayMax: extra.typing_delay_max ?? 8,
        markAsRead: Boolean(extra.mark_as_read),
        splitMessages: Boolean(extra.split_messages),
        learningPolicy: extra.learning_policy ?? "disabled",
      }
    })

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
      voiceSpeed = 1.0,
      voiceStability = 0.5,
      voiceSimilarity = 0.75,
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
        voiceSpeed,
        voiceStability,
        voiceSimilarity,
        createdById: userId || null,
      },
    })

    return NextResponse.json({ success: true, data: { agent } }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
