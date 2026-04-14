import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"
import crypto from "crypto"

// Lazy migration para garantir coluna name
async function ensureNameCol() {
  await defaultPrisma.$executeRawUnsafe(`ALTER TABLE webhooks ADD COLUMN name TEXT NOT NULL DEFAULT ''`).catch(() => {})
}

// GET /api/webhooks — lista todos os endpoints
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  await ensureNameCol()
  const webhooks = await prisma.$queryRawUnsafe<{
    id: string; name: string; url: string; events: string; secret: string | null; is_active: number; created_at: string
  }[]>(`SELECT id, name, url, events, secret, is_active, created_at FROM webhooks ORDER BY created_at DESC`)

  return NextResponse.json({
    success: true,
    data: webhooks.map((w) => ({
      ...w,
      events: (() => { try { return JSON.parse(w.events) } catch { return [] } })(),
      isActive: Boolean(w.is_active),
    })),
  })
}

// POST /api/webhooks — cria novo endpoint
export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  await ensureNameCol()
  const body = await request.json()
  const { name, url, events, secret } = body

  if (!url || !url.startsWith("http")) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "URL inválida" } },
      { status: 400 }
    )
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const eventsJson = JSON.stringify(Array.isArray(events) ? events : [])

  await prisma.$executeRawUnsafe(
    `INSERT INTO webhooks (id, name, url, events, secret, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    id, name || "", url, eventsJson, secret || null, now, now
  )

  return NextResponse.json({ success: true, data: { id, name, url, events: events || [], isActive: true } }, { status: 201 })
}
