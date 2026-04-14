import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { deleteMedia } from "@/lib/media-storage"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(_req)
  const { id } = params
  if (!id) return NextResponse.json({ success: false, error: "ID obrigatório" }, { status: 400 })

  const message = await prisma.message.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ success: false, error: "Mensagem não encontrada" }, { status: 404 })

  // Delete media file from Supabase Storage if present
  if (message.mediaUrl) {
    try {
      await deleteMedia(message.mediaUrl)
    } catch (err) {
      console.warn("[DELETE message] Erro ao deletar arquivo de mídia:", err)
    }
  }

  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
