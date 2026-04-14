import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"

async function canModify(noteId: string, requestUserId: string) {
  const note = await prisma.interaction.findUnique({
    where: { id: noteId },
    select: { userId: true },
  })
  if (!note) return { allowed: false, note: null }

  const actor = await prisma.user.findUnique({
    where: { id: requestUserId },
    select: { role: true },
  })
  const isSuperAdmin = actor?.role === "super_admin"
  const isOwner = note.userId === requestUserId

  return { allowed: isSuperAdmin || isOwner, note }
}

// PATCH /api/leads/[id]/notes/[noteId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json().catch(() => ({}))
    const { content, requestUserId } = body

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Conteúdo obrigatório" } }, { status: 400 })
    }
    if (!requestUserId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Usuário não identificado" } }, { status: 401 })
    }

    const { allowed } = await canModify(params.noteId, requestUserId)
    if (!allowed) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Sem permissão para editar esta anotação" } }, { status: 403 })
    }

    const updated = await prisma.interaction.update({
      where: { id: params.noteId },
      data: { content: content.trim() },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return NextResponse.json({ success: true, data: { note: updated } })
  } catch (error) {
    console.error("[Notes] PATCH error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/notes/[noteId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json().catch(() => ({}))
    const { requestUserId } = body

    if (!requestUserId) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Usuário não identificado" } }, { status: 401 })
    }

    const { allowed } = await canModify(params.noteId, requestUserId)
    if (!allowed) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Sem permissão para excluir esta anotação" } }, { status: 403 })
    }

    await prisma.interaction.delete({ where: { id: params.noteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Notes] DELETE error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}
