import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const agent = await (prisma.agent as any).findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        knowledgeFiles: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!agent) {
      return NextResponse.json({ success: false, error: "Agente não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { agent } })
  } catch (error) {
    console.error("Erro ao buscar agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userRole = req.headers.get("x-user-role")

  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      name,
      description,
      systemPrompt,
      tone,
      mode,
      provider,
      model,
      temperature,
      maxTokens,
      escalateThreshold,
      connectionIds,
      isActive,
      voiceEnabled,
      voiceMode,
      voiceId,
      typingDelay,
      typingDelayMax,
      markAsRead,
      splitMessages,
    } = body

    // Campos conhecidos pelo Prisma client em memória
    const knownData: Record<string, unknown> = {}
    if (name !== undefined) knownData.name = name.trim()
    if (description !== undefined) knownData.description = description?.trim() || null
    if (systemPrompt !== undefined) knownData.systemPrompt = systemPrompt
    if (tone !== undefined) knownData.tone = tone
    if (mode !== undefined) knownData.mode = mode
    if (provider !== undefined) knownData.provider = provider || null
    if (model !== undefined) knownData.model = model || null
    if (temperature !== undefined) knownData.temperature = temperature
    if (maxTokens !== undefined) knownData.maxTokens = maxTokens
    if (escalateThreshold !== undefined) knownData.escalateThreshold = escalateThreshold
    if (connectionIds !== undefined) knownData.connectionIds = JSON.stringify(connectionIds)
    if (isActive !== undefined) knownData.isActive = isActive

    if (Object.keys(knownData).length > 0) {
      await (prisma.agent as any).update({ where: { id: params.id }, data: knownData })
    }

    // Campos adicionados após o server iniciar — usa raw SQL para contornar cache do Prisma client
    const rawParts: string[] = []
    const rawValues: unknown[] = []

    const addRaw = (col: string, val: unknown) => { rawParts.push(`${col} = ?`); rawValues.push(val) }

    if (voiceEnabled !== undefined) addRaw("voice_enabled", voiceEnabled ? 1 : 0)
    if (voiceMode !== undefined) addRaw("voice_mode", voiceMode)
    if (voiceId !== undefined) addRaw("voice_id", voiceId || null)
    if (typingDelay !== undefined) addRaw("typing_delay", typingDelay ? 1 : 0)
    if (typingDelayMax !== undefined) addRaw("typing_delay_max", typingDelayMax)
    if (markAsRead !== undefined) addRaw("mark_as_read", markAsRead ? 1 : 0)
    if (splitMessages !== undefined) addRaw("split_messages", splitMessages ? 1 : 0)

    if (rawParts.length > 0) {
      rawValues.push(params.id)
      await prisma.$executeRawUnsafe(
        `UPDATE agents SET ${rawParts.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
        ...rawValues
      )
    }

    // Retorna o agente atualizado via raw para incluir todos os campos
    const rows = await prisma.$queryRaw<any[]>`SELECT * FROM agents WHERE id = ${params.id}`
    const agent = rows[0] ?? null

    return NextResponse.json({ success: true, data: { agent } })
  } catch (error) {
    console.error("Erro ao atualizar agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userRole = req.headers.get("x-user-role")

  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    await (prisma.agent as any).delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
