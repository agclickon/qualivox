import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const agent = await prisma.agent.findUnique({
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

// PATCH - v5 final
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  console.log("[PATCH Agent] v5 - ID:", params.id)
  const prisma = await getPrismaFromRequest(req)
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
      voiceSpeed,
      voiceStability,
      voiceSimilarity,
      typingDelay,
      typingDelayMax,
      markAsRead,
      splitMessages,
      learningPolicy,
      supervisorPhone,
      calendarEnabled,
      calendarAddMeetLink,
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

    // Campos de voz
    if (voiceEnabled !== undefined) (knownData as any).voiceEnabled = voiceEnabled
    if (voiceMode !== undefined) (knownData as any).voiceMode = voiceMode
    if (voiceId !== undefined) (knownData as any).voiceId = voiceId || null
    if (voiceSpeed !== undefined) (knownData as any).voiceSpeed = voiceSpeed
    if (voiceStability !== undefined) (knownData as any).voiceStability = voiceStability
    if (voiceSimilarity !== undefined) (knownData as any).voiceSimilarity = voiceSimilarity
    
    // Campos de comportamento
    if (typingDelay !== undefined) (knownData as any).typingDelay = typingDelay
    if (typingDelayMax !== undefined) (knownData as any).typingDelayMax = typingDelayMax
    if (markAsRead !== undefined) (knownData as any).markAsRead = markAsRead
    if (splitMessages !== undefined) (knownData as any).splitMessages = splitMessages
    if (learningPolicy !== undefined) (knownData as any).learningPolicy = learningPolicy
    if (supervisorPhone !== undefined) (knownData as any).supervisorPhone = supervisorPhone || null
    
    // Campos de calendário
    if (calendarEnabled !== undefined) (knownData as any).calendarEnabled = calendarEnabled
    if (calendarAddMeetLink !== undefined) (knownData as any).calendarAddMeetLink = calendarAddMeetLink

    if (Object.keys(knownData).length > 0) {
      console.log("[Agent Update] Campos:", Object.keys(knownData))
      await prisma.agent.update({ where: { id: params.id }, data: knownData })
    }

    // Retorna o agente atualizado
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        knowledgeFiles: { orderBy: { createdAt: "desc" } },
      },
    })

    return NextResponse.json({ success: true, data: { agent } })
  } catch (error) {
    console.error("Erro ao atualizar agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  const userRole = req.headers.get("x-user-role")

  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    await prisma.agent.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir agente:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
