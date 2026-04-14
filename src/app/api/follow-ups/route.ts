import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import "@/lib/jobs/follow-up-runner"
import "@/lib/jobs/reminder-runner"

const followUpSchema = z.object({
  id: z.string().uuid().optional(),
  leadId: z.string().uuid(),
  conversationId: z.string().uuid(),
  sendAt: z.string(),
  message: z.string().min(1),
  templateId: z.string().uuid().optional().nullable(),
  templateVariables: z.record(z.string()).optional().nullable(),
})

const followUpInclude = {
  template: { select: { id: true, name: true } },
}

export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = request.nextUrl
    const conversationId = searchParams.get("conversationId")
    const leadId = searchParams.get("leadId")

    if (!conversationId && !leadId) {
      return NextResponse.json(
        { success: false, error: "Informe conversationId ou leadId" },
        { status: 400 },
      )
    }

    const where: Record<string, unknown> = {}
    if (conversationId) where.conversationId = conversationId
    if (leadId) where.leadId = leadId

    const followUps = await prisma.followUp.findMany({
      where,
      include: followUpInclude,
      orderBy: { sendAt: "asc" },
    })

    return NextResponse.json({ success: true, data: followUps })
  } catch (error) {
    console.error("[FollowUps][GET]", error)
    return NextResponse.json(
      { success: false, error: "Erro ao listar follow-ups" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const json = await request.json()
    const parsed = followUpSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { id, leadId, conversationId, message, templateId, templateVariables } = parsed.data
    const sendAtDate = new Date(parsed.data.sendAt)
    if (Number.isNaN(sendAtDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Data/hora inválida" },
        { status: 400 },
      )
    }

    const now = new Date()
    if (sendAtDate.getTime() <= now.getTime()) {
      return NextResponse.json(
        { success: false, error: "Escolha um horário futuro" },
        { status: 400 },
      )
    }

    const conflicting = await prisma.followUp.findFirst({
      where: {
        leadId,
        sendAt: sendAtDate,
        ...(id ? { NOT: { id } } : {}),
      },
    })

    if (conflicting) {
      return NextResponse.json(
        { success: false, error: "Já existe um follow-up para esse horário" },
        { status: 409 },
      )
    }

    const payload = {
      leadId,
      conversationId,
      sendAt: sendAtDate,
      message,
      templateId: templateId ?? null,
      templateVariables: templateVariables ? JSON.stringify(templateVariables) : null,
      status: "scheduled" as const,
      sentAt: null,
      lastError: null,
    }

    const followUp = id
      ? await prisma.followUp.update({
          where: { id },
          data: payload,
          include: followUpInclude,
        })
      : await prisma.followUp.create({
          data: payload,
          include: followUpInclude,
        })

    return NextResponse.json({ success: true, data: followUp })
  } catch (error) {
    console.error("[FollowUps][POST]", error)
    if (typeof error === "object" && error && "code" in error && (error as any).code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Já existe um follow-up para esse horário" },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { success: false, error: "Erro ao salvar follow-up" },
      { status: 500 },
    )
  }
}
