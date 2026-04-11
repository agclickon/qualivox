import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import { getCalendarIntegration, getGoogleCredentials } from "@/lib/calendar-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  const payload = await verifyAccessToken(token)
  if (!payload) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

  const [integration, creds] = await Promise.all([
    getCalendarIntegration(payload.userId),
    getGoogleCredentials(),
  ])

  return NextResponse.json({
    success: true,
    data: {
      configured: !!creds,
      connected: !!(integration?.is_active),
      calendarId: integration?.calendar_id ?? null,
      calendarName: integration?.calendar_name ?? null,
    },
  })
}
