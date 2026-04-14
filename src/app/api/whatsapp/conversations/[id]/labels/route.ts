import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export const dynamic = "force-dynamic"

// GET — list labels for a conversation
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_req)
  const conv = await prisma.conversation.findUnique({ where: { id: params.id }, select: { labels: true } })
  if (!conv) return NextResponse.json({ success: false, error: "Não encontrada" }, { status: 404 })
  const labels: string[] = JSON.parse(conv.labels || "[]")
  return NextResponse.json({ success: true, labels })
}

// POST — add label { label: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  const { label } = await req.json() as { label?: string }
  if (!label?.trim()) return NextResponse.json({ success: false, error: "label obrigatório" }, { status: 400 })

  const conv = await prisma.conversation.findUnique({ where: { id: params.id }, select: { labels: true } })
  if (!conv) return NextResponse.json({ success: false, error: "Não encontrada" }, { status: 404 })

  const labels: string[] = JSON.parse(conv.labels || "[]")
  if (!labels.includes(label)) labels.push(label)
  await prisma.conversation.update({ where: { id: params.id }, data: { labels: JSON.stringify(labels) } })
  return NextResponse.json({ success: true, labels })
}

// DELETE — remove label { label: string }
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  const { label } = await req.json() as { label?: string }
  if (!label) return NextResponse.json({ success: false, error: "label obrigatório" }, { status: 400 })

  const conv = await prisma.conversation.findUnique({ where: { id: params.id }, select: { labels: true } })
  if (!conv) return NextResponse.json({ success: false, error: "Não encontrada" }, { status: 404 })

  const labels: string[] = JSON.parse(conv.labels || "[]").filter((l: string) => l !== label)
  await prisma.conversation.update({ where: { id: params.id }, data: { labels: JSON.stringify(labels) } })
  return NextResponse.json({ success: true, labels })
}
