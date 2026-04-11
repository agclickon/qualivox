import { NextRequest, NextResponse } from "next/server"
import { verifyAccessToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })

  const payload = await verifyAccessToken(token)
  if (!payload) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 })

  await prisma.$executeRawUnsafe(
    `UPDATE calendar_integrations SET is_active = 0, access_token = NULL, updated_at = datetime('now')
     WHERE user_id = ? AND provider = 'google'`,
    payload.userId
  )

  return NextResponse.json({ success: true })
}
