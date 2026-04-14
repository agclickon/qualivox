import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// PUT /api/webhooks/[id] — atualiza endpoint
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(request)
  const body = await request.json()
  const { name, url, events, secret, isActive } = body

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1

  if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name) }
  if (url !== undefined) { sets.push(`url = $${idx++}`); vals.push(url) }
  if (events !== undefined) { sets.push(`events = $${idx++}`); vals.push(JSON.stringify(events)) }
  if (secret !== undefined) { sets.push(`secret = $${idx++}`); vals.push(secret || null) }
  if (isActive !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(Boolean(isActive)) }
  sets.push(`updated_at = $${idx++}`); vals.push(new Date().toISOString())
  vals.push(params.id)

  await prisma.$executeRawUnsafe(
    `UPDATE webhooks SET ${sets.join(", ")} WHERE id = $${idx}`,
    ...vals
  )

  return NextResponse.json({ success: true })
}

// DELETE /api/webhooks/[id] — remove endpoint
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_req)
  await prisma.$executeRawUnsafe(`DELETE FROM webhooks WHERE id = ?`, params.id)
  return NextResponse.json({ success: true })
}
