import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// GET /api/automations - Listar automações
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { logs: true } },
      },
    })

    return NextResponse.json({ success: true, data: { automations } })
  } catch (error) {
    console.error("Erro ao listar automações:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/automations - Criar automação
export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()
    const { name, description, trigger, actions } = body

    if (!name || !trigger || !actions) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name, trigger e actions são obrigatórios" } },
        { status: 400 }
      )
    }

    const automation = await prisma.automation.create({
      data: {
        name,
        description: description || null,
        trigger: typeof trigger === 'string' ? trigger : JSON.stringify(trigger),
        actions: typeof actions === 'string' ? actions : JSON.stringify(actions),
      },
    })

    return NextResponse.json({ success: true, data: automation }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar automação:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
