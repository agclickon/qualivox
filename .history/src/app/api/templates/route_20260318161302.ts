import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/templates - Listar templates de mensagem
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || ""

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: { templates } })
  } catch (error) {
    console.error("Erro ao listar templates:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/templates - Criar template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, content, variables, category } = body

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name e content são obrigatórios" } },
        { status: 400 }
      )
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        content,
        variables: variables || [],
        category: category || null,
      },
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar template:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
