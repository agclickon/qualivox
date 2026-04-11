import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { saveGoogleTokens, getGoogleCredentials } from "@/lib/calendar-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const userId = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  if (error) {
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=${error}`)
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=missing_params`)
  }

  try {
    const creds = await getGoogleCredentials()
    if (!creds) {
      return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=no_credentials`)
    }

    const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri)
    const { tokens } = await oauth2.getToken(code)
    await saveGoogleTokens(userId, tokens)

    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=connected`)
  } catch (err) {
    console.error("[Google Calendar] Erro no callback OAuth:", err)
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=token_exchange`)
  }
}
