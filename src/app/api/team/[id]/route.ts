import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/team/:id - Atualizar membro da equipe
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role, isActive } = body

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Erro ao atualizar membro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// DELETE /api/team/:id - Desativar membro da equipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Apenas super-admin pode desativar usuários" } },
        { status: 403 }
      )
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { message: "Usuário desativado" } })
  } catch (error) {
    console.error("Erro ao desativar membro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
