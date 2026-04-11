import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/leads/[id]/tags — listar tags do lead
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadTags = await prisma.leadTag.findMany({
    where: { leadId: params.id },
    include: { tag: true },
    orderBy: { appliedAt: "asc" },
  })
  return NextResponse.json({ success: true, data: leadTags })
}

// POST /api/leads/[id]/tags — aplicar tag ao lead
// Body: { tagId, source?, appliedBy? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as { tagId?: string; source?: string; appliedBy?: string }
    if (!body.tagId) {
      return NextResponse.json({ success: false, error: "tagId obrigatório" }, { status: 400 })
    }

    const tag = await prisma.tag.findUnique({ where: { id: body.tagId } })
    if (!tag) return NextResponse.json({ success: false, error: "Tag não encontrada" }, { status: 404 })
    if (!tag.isActive) return NextResponse.json({ success: false, error: "Tag inativa" }, { status: 400 })

    const leadTag = await prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId: params.id, tagId: body.tagId } },
      create: {
        leadId: params.id,
        tagId: body.tagId,
        source: body.source ?? "manual",
        appliedBy: body.appliedBy ?? null,
      },
      update: {
        source: body.source ?? "manual",
        appliedBy: body.appliedBy ?? null,
        appliedAt: new Date(),
      },
      include: { tag: true },
    })
    return NextResponse.json({ success: true, data: leadTag }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Erro interno" }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/tags?tagId=xxx — remover tag do lead
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tagId = req.nextUrl.searchParams.get("tagId")
  if (!tagId) return NextResponse.json({ success: false, error: "tagId obrigatório" }, { status: 400 })
  try {
    await prisma.leadTag.delete({
      where: { leadId_tagId: { leadId: params.id, tagId } },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Associação não encontrada" }, { status: 404 })
  }
}
