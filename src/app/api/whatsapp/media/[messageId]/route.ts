import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createMediaReadStream, getMediaStat } from "@/lib/media-storage"

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
    const stat = getMediaStat(relativePath)
    const mimeType = (meta?.mimeType as string) || "application/octet-stream"
    const range = request.headers.get("range")

    if (range) {
      const bytesPrefix = "bytes="
      if (!range.startsWith(bytesPrefix)) {
        return NextResponse.json({ success: false, error: "Invalid range" }, { status: 416 })
      }

      const [startStr, endStr] = range.substring(bytesPrefix.length).split("-")
      const start = Number(startStr)
      const end = endStr ? Number(endStr) : stat.size - 1
      if (isNaN(start) || isNaN(end) || start > end) {
        return NextResponse.json({ success: false, error: "Invalid range values" }, { status: 416 })
      }

      const chunkSize = end - start + 1
      const stream = createMediaReadStream(relativePath, { start, end })
      return new Response(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
        },
      })
    }

    const stream = createMediaReadStream(relativePath)
    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Length": stat.size.toString(),
        "Content-Type": mimeType,
      },
    })
  } catch (error) {
    console.error("[WhatsApp Media] Error streaming media:", error)
    return NextResponse.json({ success: false, error: "Failed to load media" }, { status: 500 })
  }
}
