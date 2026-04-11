import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  if (!token) return null
  try {
    const payload = await verifyAccessToken(token)
    if (!payload) return null
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, role: true, isActive: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch {
    return null
  }
}

// PUT /api/templates/:id - Atualizar template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } }, { status: 401 })
    }

    const template = await prisma.messageTemplate.findUnique({ where: { id: params.id } })
    if (!template) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Template não encontrado" } }, { status: 404 })
    }

    // Apenas o dono ou super_admin pode editar
    if (!template.isGlobal && template.createdById !== authUser.id && authUser.role !== "super_admin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } }, { status: 403 })
    }

    const body = await request.json()

    const updated = await prisma.messageTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name ?? template.name,
        content: body.content ?? template.content,
        variables: body.variables ?? template.variables,
        category: body.category !== undefined ? body.category : template.category,
        isActive: body.isActive !== undefined ? body.isActive : template.isActive,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Erro ao atualizar template:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}

// DELETE /api/templates/:id - Desativar template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } }, { status: 401 })
    }

    const template = await prisma.messageTemplate.findUnique({ where: { id: params.id } })
    if (!template) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Template não encontrado" } }, { status: 404 })
    }

    // Apenas o dono ou super_admin pode excluir
    if (!template.isGlobal && template.createdById !== authUser.id && authUser.role !== "super_admin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } }, { status: 403 })
    }

    await prisma.messageTemplate.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir template:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}
