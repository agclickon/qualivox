import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const connections = await prisma.whatsappConnection.findMany({
    orderBy: { createdAt: "asc" },
  })

  // Inicializa sessões Baileys para conexões com dados salvos
  const { getSession, getSessionPhoneNumber, getSessionProfilePicUrl, initSession, registerSessionHook } = await import("@/lib/baileys-session")
  const { startMessageListener } = await import("@/lib/baileys-listener")
  for (const c of connections) {
    registerSessionHook(c.id, (session) => { startMessageListener(session, c.id) })
    if (!getSession(c.id) && c.session && c.session.length > 2) {
      initSession(c.id).catch(() => {})
    }
  }
  // Aguarda um momento para sessões iniciarem
  await new Promise(r => setTimeout(r, 500))
  const enriched = await Promise.all(connections.map(async (c) => {
    const sessionAlive = !!getSession(c.id)
    const livePhone = sessionAlive ? (getSessionPhoneNumber(c.id) ?? c.phoneNumber) : c.phoneNumber
    const livePic = sessionAlive ? await getSessionProfilePicUrl(c.id) : null
    // Usa foto salva no banco como fallback quando sessão não está ativa
    const profilePicUrl = livePic ?? (c as any).profilePicUrl ?? null
    // Persiste phoneNumber e profilePicUrl no banco
    const updateData: Record<string, unknown> = {}
    if (sessionAlive && livePhone && !c.phoneNumber) updateData.phoneNumber = livePhone
    if (livePic && livePic !== (c as any).profilePicUrl) updateData.profilePicUrl = livePic
    if (Object.keys(updateData).length > 0) {
      prisma.whatsappConnection.update({ where: { id: c.id }, data: updateData }).catch(() => {})
    }
    return {
      ...c,
      status: sessionAlive ? "CONNECTED" : c.status,
      phoneNumber: livePhone,
      profilePicUrl,
    }
  }))

  return NextResponse.json({ success: true, data: { connections: enriched } })
}

export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
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
