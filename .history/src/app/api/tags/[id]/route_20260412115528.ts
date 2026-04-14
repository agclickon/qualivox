import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export const dynamic = "force-dynamic"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// GET /api/tags/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_req)
  const tag = await prisma.tag.findUnique({
    where: { id: params.id },
    include: { _count: { select: { leadTags: true } } },
  })
  if (!tag) return NextResponse.json({ success: false, error: "Tag não encontrada" }, { status: 404 })
  return NextResponse.json({ success: true, data: tag })
}

// PUT /api/tags/[id] — atualizar tag
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const body = await req.json() as {
      name?: string
      colorHex?: string
      description?: string
      isActive?: boolean
    }
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      data.name = body.name.trim()
      data.slug = slugify(body.name.trim())
    }
    if (body.colorHex !== undefined) data.colorHex = body.colorHex
    if (body.description !== undefined) data.description = body.description
    if (body.isActive !== undefined) data.isActive = body.isActive

    const tag = await prisma.tag.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, data: tag })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno"
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Tag com esse nome já existe" }, { status: 409 })
    }
    if (msg.includes("Record to update not found")) {
      return NextResponse.json({ success: false, error: "Tag não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE /api/tags/[id] — apagar tag permanentemente (remove todas as associações via cascade)export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_req)
  try {
    await prisma.tag.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno"
    if (msg.includes("Record to delete not found")) {
      return NextResponse.json({ success: false, error: "Tag não encontrada" }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

