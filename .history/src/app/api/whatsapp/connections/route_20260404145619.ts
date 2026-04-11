import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const connections = await prisma.whatsappConnection.findMany({
    orderBy: { createdAt: "asc" },
  })

  // Cross-reference with in-memory Baileys sessions for real-time status and phone number
  const { getSession, getSessionPhoneNumber } = await import("@/lib/baileys-session")
  const enriched = connections.map((c) => {
    const sessionAlive = !!getSession(c.id)
    const livePhone = sessionAlive ? (getSessionPhoneNumber(c.id) ?? c.phoneNumber) : c.phoneNumber
    // Persist phone number to DB if we just got it
    if (sessionAlive && livePhone && !c.phoneNumber) {
      prisma.whatsappConnection.update({ where: { id: c.id }, data: { phoneNumber: livePhone } }).catch(() => {})
    }
    return {
      ...c,
      status: sessionAlive ? "CONNECTED" : c.status,
      phoneNumber: livePhone,
    }
  })

  return NextResponse.json({ success: true, data: { connections: enriched } })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const rawName = typeof body?.name === "string" ? body.name.trim() : ""
  const name = rawName || `Conexão ${new Date().toLocaleString("pt-BR")}`

  const connection = await prisma.$transaction(async (tx) => {
    await tx.whatsappConnection.updateMany({ data: { isDefault: false } })
    return tx.whatsappConnection.create({
      data: {
        name,
        provider: "baileys",
        isDefault: true,
        status: "disconnected",
      },
    })
  })

  return NextResponse.json({ success: true, data: { connection } }, { status: 201 })
}
