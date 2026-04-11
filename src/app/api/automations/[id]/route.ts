import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/automations/:id - Atualizar automação
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const automation = await prisma.automation.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        trigger: body.trigger ? (typeof body.trigger === 'string' ? body.trigger : JSON.stringify(body.trigger)) : undefined,
        actions: body.actions ? (typeof body.actions === 'string' ? body.actions : JSON.stringify(body.actions)) : undefined,
        isActive: body.isActive,
      },
    })

    return NextResponse.json({ success: true, data: automation })
  } catch (error) {
    console.error("Erro ao atualizar automação:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// DELETE /api/automations/:id - Excluir automação
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.automation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir automação:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
