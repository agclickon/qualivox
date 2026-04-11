import { downloadContentFromMessage, proto } from "@whiskeysockets/baileys"
import sharp from "sharp"
import { saveMedia, saveThumbnail } from "@/lib/media-storage"

export type MediaProcessResult = {
  mediaUrl: string
  metadata: Record<string, unknown>
  messageType: string
  displayText: string
}

const FALLBACK_MESSAGES: Record<string, string> = {
  image: "📷 Foto recebida",
  video: "🎬 Vídeo recebido",
  audio: "🎧 Áudio recebido",
  document: "📄 Documento recebido",
  sticker: "🔖 Sticker recebido",
}

function normalizeMime(mime?: string | null) {
  if (!mime) return "application/octet-stream"
  return mime.split(";")[0]
}

function guessExtension(mime?: string | null, fallback = "bin") {
  const clean = normalizeMime(mime)
  if (!clean.includes("/")) return fallback
  return clean.split("/").pop() || fallback
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array>) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function base64ToBuffer(data?: string | null) {
  if (!data) return null
  try {
    return Buffer.from(data, "base64")
  } catch {
    return null
  }
}

type ImagePayload = NonNullable<proto.IMessage["imageMessage"]>
type VideoPayload = NonNullable<proto.IMessage["videoMessage"]>
type AudioPayload = NonNullable<proto.IMessage["audioMessage"]>
type DocumentPayload = NonNullable<proto.IMessage["documentMessage"]>
type StickerPayload = NonNullable<proto.IMessage["stickerMessage"]>

type ExtractedMedia =
  | { kind: "image"; payload: ImagePayload }
  | { kind: "video"; payload: VideoPayload }
  | { kind: "audio"; payload: AudioPayload }
  | { kind: "document"; payload: DocumentPayload }
  | { kind: "sticker"; payload: StickerPayload }

function extractMediaContent(msg: proto.IWebMessageInfo): ExtractedMedia | null {
  const content = msg.message
  if (!content) return null
  if (content.imageMessage) return { kind: "image", payload: content.imageMessage }
  if (content.videoMessage) return { kind: "video", payload: content.videoMessage }
  if (content.audioMessage) return { kind: "audio", payload: content.audioMessage }
  if (content.documentMessage) return { kind: "document", payload: content.documentMessage }
  if (content.stickerMessage) return { kind: "sticker", payload: content.stickerMessage }
  return null
}

export async function processIncomingMedia(
  message: proto.IWebMessageInfo,
  conversationId: string
): Promise<MediaProcessResult | null> {
  const media = extractMediaContent(message)
  if (!media) return null

  const streamType = media.kind === "sticker" ? "sticker" : media.kind
  const stream = await downloadContentFromMessage(media.payload as any, streamType)
  const buffer = await streamToBuffer(stream)
  const mimeType = normalizeMime((media.payload as { mimetype?: string }).mimetype)
  const extension = guessExtension(mimeType, media.kind === "audio" ? "ogg" : media.kind)

  const mediaUrl = saveMedia({
    conversationId,
    extension,
    buffer,
    prefix: media.kind,
  })

  const rawWaveform = (media.payload as { waveform?: Uint8Array | Buffer | null }).waveform
  const waveformB64 = rawWaveform && rawWaveform.length > 0
    ? Buffer.from(rawWaveform).toString("base64")
    : undefined

  const metadata: Record<string, unknown> = {
    mimeType,
    extension,
    fileSize: buffer.length,
    seconds: (media.payload as { seconds?: number }).seconds,
    fileName: (media.payload as { fileName?: string }).fileName,
    ptt: (media.payload as { ptt?: boolean }).ptt,
    width: (media.payload as { width?: number }).width,
    height: (media.payload as { height?: number }).height,
    ...(waveformB64 ? { waveform: waveformB64 } : {}),
  }

  if (media.payload?.mediaKeyTimestamp) {
    metadata.mediaKeyTimestamp = media.payload.mediaKeyTimestamp
  }

  if (media.kind === "image") {
    const thumbBuffer = await sharp(buffer)
      .resize({ width: 320, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer()
    const thumbPath = saveThumbnail({
      conversationId,
      buffer: thumbBuffer,
      originalName: `thumb-${mediaUrl}`,
    })
    metadata.thumbPath = thumbPath
  } else if (media.kind === "video") {
    const jpegThumb = base64ToBuffer(media.payload?.jpegThumbnail as any)
    if (jpegThumb) {
      const thumbPath = saveThumbnail({
        conversationId,
        buffer: jpegThumb,
        originalName: `thumb-${mediaUrl}`,
      })
      metadata.thumbPath = thumbPath
    }
  } else if (media.kind === "sticker") {
    metadata.isAnimated = (media.payload as { isAnimated?: boolean }).isAnimated
  }

  return {
    mediaUrl,
    metadata,
    messageType: media.kind,
    displayText: FALLBACK_MESSAGES[media.kind] || "Arquivo recebido",
  }
}
