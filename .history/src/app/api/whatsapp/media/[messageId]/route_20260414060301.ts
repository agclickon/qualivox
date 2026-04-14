import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { getPublicMediaUrl } from "@/lib/media-storage"

function parseMetadata(metadata?: string | null): Record<string, unknown> | null {
  if (!metadata) return null
  try {
    return JSON.parse(metadata)
  } catch {
    return null
  }
}

type RouteParams = {
  params: {
    messageId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const prisma = await getPrismaFromRequest(request)
  const { messageId } = params
  if (!messageId) {
    return NextResponse.json({ success: false, error: "messageId is required" }, { status: 400 })
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { mediaUrl: true, metadata: true },
  })

  if (!message || !message.mediaUrl) {
    return NextResponse.json({ success: false, error: "Media not found" }, { status: 404 })
  }

  const meta = parseMetadata(message.metadata)
  const searchParams = request.nextUrl.searchParams
  const wantsThumb = searchParams.get("thumb") === "1"
  const relativePath = wantsThumb && meta?.thumbPath
    ? String(meta.thumbPath)
    : message.mediaUrl

  try {
    // Se o mediaUrl já for uma URL completa (Supabase public URL), redireciona direto
    if (relativePath.startsWith("http")) {
      return NextResponse.redirect(relativePath)
    }

    // Redireciona para a URL pública do Supabase Storage
    const publicUrl = getPublicMediaUrl(relativePath)
    return NextResponse.redirect(publicUrl)
  } catch (error) {
    console.error("[WhatsApp Media] Error streaming media:", error)
    return NextResponse.json({ success: false, error: "Failed to load media" }, { status: 500 })
  }
}
