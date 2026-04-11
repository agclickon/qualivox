import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import { getGoogleAuthUrl, getGoogleCredentials } from "@/lib/calendar-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  const payload = await verifyAccessToken(token)
  if (!payload) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

  const creds = await getGoogleCredentials()
  if (!creds) {
    return NextResponse.json({
      success: false,
      error: "Google Client ID e Client Secret não configurados. Preencha em Configurações → Integrações."
    }, { status: 400 })
  }

  try {
    const url = await getGoogleAuthUrl(payload.userId)
    return NextResponse.json({ success: true, data: { url } })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
