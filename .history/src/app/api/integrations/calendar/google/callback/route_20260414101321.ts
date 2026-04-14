import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { saveGoogleTokens, getGoogleCredentials } from "@/lib/calendar-service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const userId = searchParams.get("state")
  const error = searchParams.get("error")

  // Detecta URL automaticamente: env var → host do request → localhost fallback
  const host = req.headers.get("host") || "localhost:3000"
  const protocol = req.headers.get("x-forwarded-proto") || "http"
  const detectedUrl = `${protocol}://${host}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || detectedUrl

  if (error) {
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=${error}`)
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=missing_params`)
  }

  try {
    const creds = await getGoogleCredentials()
    console.log("[Google Calendar] Credenciais:", { 
      clientId: creds?.clientId?.substring(0, 10) + "...", 
      redirectUri: creds?.redirectUri,
      hasClientSecret: !!creds?.clientSecret
    })
    
    if (!creds) {
      return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=no_credentials`)
    }

    const oauth2 = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri)
    console.log("[Google Calendar] Trocando código por token...", { code: code?.substring(0, 10) + "...", userId })
    
    const { tokens } = await oauth2.getToken(code)
    console.log("[Google Calendar] Tokens obtidos:", { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token })
    
    await saveGoogleTokens(userId, tokens)

    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=connected`)
  } catch (err: any) {
    console.error("[Google Calendar] Erro no callback OAuth:", err.message, err.response?.data)
    return NextResponse.redirect(`${appUrl}/configuracoes?tab=integracoes&calendar=error&reason=token_exchange`)
  }
}
