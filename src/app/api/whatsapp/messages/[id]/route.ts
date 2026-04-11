import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMediaRoot } from "@/lib/media-storage"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 })

  const message = await prisma.message.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ success: false, error: "Mensagem não encontrada" }, { status: 404 })

  // Delete media file from disk if present
  if (message.mediaUrl) {
    try {
      const filePath = path.join(getMediaRoot(), message.mediaUrl)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (err) {
      console.warn("[DELETE message] Erro ao deletar arquivo de mídia:", err)
    }
  }

  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
