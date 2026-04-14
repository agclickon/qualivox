import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listUpcomingEvents,
  listLocalEvents,
  getEventsForRange,
} from "@/lib/calendar-service"
import { scheduleEventReminders, cancelEventReminders } from "@/lib/reminder-service"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function getUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessToken(token)
}

// GET /api/integrations/calendar/events?leadId=&conversationId=&upcoming=true&timeMin=&timeMax=
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const payload = await getUser(req)
  if (!payload) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const upcoming = searchParams.get("upcoming") === "true"
  const leadId = searchParams.get("leadId") ?? undefined
  const conversationId = searchParams.get("conversationId") ?? undefined
  const timeMin = searchParams.get("timeMin") ?? undefined
  const timeMax = searchParams.get("timeMax") ?? undefined

  const calendarIdsParam = searchParams.get("calendarIds")
  const calendarIds = calendarIdsParam ? calendarIdsParam.split(",").filter(Boolean) : undefined

  try {
    // Busca por intervalo de datas direto do Google Calendar (para a página Agenda)
    if (timeMin && timeMax) {
      const events = await getEventsForRange(payload.userId, timeMin, timeMax, calendarIds)
      return NextResponse.json({ success: true, data: { events } })
    }

    if (upcoming) {
      const events = await listUpcomingEvents(payload.userId)
      return NextResponse.json({ success: true, data: { events } })
    }

    const events = await listLocalEvents({ userId: payload.userId, leadId, conversationId })
    return NextResponse.json({ success: true, data: { events } })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// POST /api/integrations/calendar/events — criar evento
export async function POST(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const payload = await getUser(req)
  if (!payload) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const { title, description, startTime, endTime, attendeeEmail, attendeeName, addMeetLink, timezone, calendarId, leadId, conversationId } = body

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: "title, startTime e endTime são obrigatórios" }, { status: 400 })
    }

    const event = await createCalendarEvent(
      payload.userId,
      { title, description, startTime, endTime, attendeeEmail, attendeeName, addMeetLink, timezone, calendarId },
      { leadId, conversationId, createdBy: "user" }
    )

    // Agenda lembretes automáticos se lead/conversation vinculados e sistema habilitado
    if (leadId && conversationId) {
      try {
        const leadRows = await prisma.$queryRaw<{ name: string }[]>`
          SELECT name FROM leads WHERE id = ${leadId} LIMIT 1
        `
        const convRows = await prisma.$queryRaw<{ connection_id: string }[]>`
          SELECT connection_id FROM conversations WHERE id = ${conversationId} LIMIT 1
        `
        const leadName = leadRows[0]?.name ?? "Lead"
        const connectionId = convRows[0]?.connection_id ?? ""

        await scheduleEventReminders({
          calendarEventId: event.googleEventId,
          googleEventId: event.googleEventId,
          leadId,
          conversationId,
          agentId: "",
          connectionId,
          eventStartTime: event.startTime,
          leadName,
          eventTitle: event.title,
        })
      } catch {
        // Não bloqueia a criação se o agendamento de lembretes falhar
      }
    }

    return NextResponse.json({ success: true, data: { event } })
  } catch (err: any) {
    console.error("[Calendar] Erro ao criar evento:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// PATCH /api/integrations/calendar/events — editar evento
export async function PATCH(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const payload = await getUser(req)
  if (!payload) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  try {
    const body = await req.json()
    const { googleEventId, ...updates } = body

    if (!googleEventId) {
      return NextResponse.json({ success: false, error: "googleEventId é obrigatório" }, { status: 400 })
    }

    const event = await updateCalendarEvent(payload.userId, googleEventId, updates)
    return NextResponse.json({ success: true, data: { event } })
  } catch (err: any) {
    console.error("[Calendar] Erro ao editar evento:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// DELETE /api/integrations/calendar/events?googleEventId=xxx
export async function DELETE(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const payload = await getUser(req)
  if (!payload) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  const googleEventId = req.nextUrl.searchParams.get("googleEventId")
  if (!googleEventId) {
    return NextResponse.json({ success: false, error: "googleEventId é obrigatório" }, { status: 400 })
  }

  try {
    await deleteCalendarEvent(payload.userId, googleEventId)
    await cancelEventReminders(googleEventId).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Calendar] Erro ao excluir evento:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
