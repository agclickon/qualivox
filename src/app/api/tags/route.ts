import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// GET /api/tags — lista todas as tags ativas (ou todas se ?all=1)
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1"
  const tags = await prisma.tag.findMany({
    where: all ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { leadTags: true } } },
  })
  return NextResponse.json({ success: true, data: tags })
}

// POST /api/tags — criar nova tag
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string
      colorHex?: string
      description?: string
      createdById?: string
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "name obrigatório" }, { status: 400 })
    }
    const slug = slugify(body.name.trim())
    const tag = await prisma.tag.create({
      data: {
        name: body.name.trim(),
        slug,
        colorHex: body.colorHex ?? "#10B981",
        description: body.description ?? null,
        createdById: body.createdById ?? null,
      },
    })
    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno"
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Tag com esse nome já existe" }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
