import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import { listCalendars } from "@/lib/calendar-service"

export const dynamic = "force-dynamic"

async function getUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessToken(token)
}

// GET /api/integrations/calendar/calendars
export async function GET(req: NextRequest) {
  const payload = await getUser(req)
  if (!payload) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  try {
    const calendars = await listCalendars(payload.userId)
    return NextResponse.json({ success: true, data: { calendars } })
  } catch (err: any) {
    // Retorna lista vazia se calendário não estiver conectado
    return NextResponse.json({ success: true, data: { calendars: [] } })
  }
}
