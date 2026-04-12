import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/tenant-context"

export async function GET(req: NextRequest) {
  try {
    const ctx = await withTenant(req)
    if (!ctx) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

    const agents = await ctx.prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { knowledgeFiles: true } },
      },
    })

    return NextResponse.json({ success: true, data: { agents } })
  } catch (error) {
    console.error("[API Agents] Erro ao listar agentes:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno", details: String(error) },
      { status: 500 }
    )
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

    const ctx = await withTenant(req)
    if (!ctx) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

    const agent = await ctx.prisma.agent.create({
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
