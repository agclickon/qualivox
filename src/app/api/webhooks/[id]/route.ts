import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/webhooks/[id] — atualiza endpoint
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const { name, url, events, secret, isActive } = body

  const sets: string[] = []
  const vals: unknown[] = []

  if (name !== undefined) { sets.push("name = ?"); vals.push(name) }
  if (url !== undefined) { sets.push("url = ?"); vals.push(url) }
  if (events !== undefined) { sets.push("events = ?"); vals.push(JSON.stringify(events)) }
  if (secret !== undefined) { sets.push("secret = ?"); vals.push(secret || null) }
  if (isActive !== undefined) { sets.push("is_active = ?"); vals.push(isActive ? 1 : 0) }
  sets.push("updated_at = ?"); vals.push(new Date().toISOString())
  vals.push(params.id)

  await prisma.$executeRawUnsafe(
    `UPDATE webhooks SET ${sets.join(", ")} WHERE id = ?`,
    ...vals
  )

  return NextResponse.json({ success: true })
}

// DELETE /api/webhooks/[id] — remove endpoint
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM webhooks WHERE id = ?`, params.id)
  return NextResponse.json({ success: true })
}
