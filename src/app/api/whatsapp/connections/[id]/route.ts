import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { removeSession } from "@/lib/baileys-session"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json().catch(() => ({}))

    const connection = await prisma.whatsappConnection.findUnique({ where: { id } })
    if (!connection) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Conexão não encontrada" } }, { status: 404 })
    }

    // Action: set as default
    if (body.action === "set_default") {
      await prisma.whatsappConnection.updateMany({ data: { isDefault: false } })
      await prisma.whatsappConnection.update({ where: { id }, data: { isDefault: true } })
      return NextResponse.json({ success: true })
    }

    // Action: disconnect
    if (body.action === "disconnect") {
      await removeSession(id, true).catch(() => {})
      await prisma.whatsappConnection.update({
        where: { id },
        data: { status: "disconnected", session: "", qrcode: "", retries: 0 },
      })
      return NextResponse.json({ success: true })
    }

    // Generic update (name)
    const updated = await prisma.whatsappConnection.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
      },
    })

    return NextResponse.json({ success: true, data: { connection: updated } })
  } catch (error) {
    console.error("[WhatsApp Connections] PUT error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json().catch(() => ({}))

    const connection = await prisma.whatsappConnection.findUnique({ where: { id } })
    if (!connection) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Conexão não encontrada" } }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma.whatsappConnection.update as any)({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "defaultAssignedToId") ? { defaultAssignedToId: body.defaultAssignedToId ?? null } : {}),
      },
    })

    return NextResponse.json({ success: true, data: { connection: updated } })
  } catch (error) {
    console.error("[WhatsApp Connections] PATCH error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const connection = await prisma.whatsappConnection.findUnique({ where: { id } })
    if (!connection) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Conexão não encontrada" } }, { status: 404 })
    }

    await removeSession(id, true).catch(() => {})
    await prisma.whatsappConnection.delete({ where: { id } })

    // Assign default to next connection if needed
    const defaultExists = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
    if (!defaultExists) {
      const nextConnection = await prisma.whatsappConnection.findFirst({ orderBy: { createdAt: "asc" } })
      if (nextConnection) {
        await prisma.whatsappConnection.update({ where: { id: nextConnection.id }, data: { isDefault: true } })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[WhatsApp Connections] DELETE error:", error)
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao remover conexão" } }, { status: 500 })
  }
}
