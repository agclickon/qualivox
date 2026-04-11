import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

interface AudioMsg {
  id: string
  mediaUrl: string
  direction: string
  createdAt: string
}

/**
 * Transcribes audio messages using OpenAI Whisper.
 * Returns a map of { messageId → transcription text }.
 * Silently skips any audio that fails.
 */
export async function transcribeAudioMessages(
  audios: AudioMsg[]
): Promise<Record<string, string>> {
  if (audios.length === 0) return {}

  const setting = await prisma.setting.findUnique({ where: { key: "openaiKey" } })
  const apiKey = setting?.value || process.env.OPENAI_API_KEY
  if (!apiKey) return {} // sem chave, ignora silenciosamente

  const results: Record<string, string> = {}

  await Promise.all(
    audios.map(async (audio) => {
      try {
        // mediaUrl pode ser caminho relativo ou absoluto no servidor
        const filePath = audio.mediaUrl.startsWith("/")
          ? path.join(process.cwd(), "public", audio.mediaUrl)
          : path.join(process.cwd(), audio.mediaUrl)

        if (!fs.existsSync(filePath)) return

        const fileBuffer = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase() || ".ogg"
        const mimeType = ext === ".mp3" ? "audio/mpeg"
          : ext === ".wav" ? "audio/wav"
          : ext === ".m4a" ? "audio/mp4"
          : ext === ".webm" ? "audio/webm"
          : "audio/ogg"

        const formData = new FormData()
        formData.append("file", new Blob([fileBuffer], { type: mimeType }), `audio${ext}`)
        formData.append("model", "whisper-1")
        formData.append("language", "pt")
        formData.append("response_format", "text")

        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        })

        if (res.ok) {
          const text = (await res.text()).trim()
          if (text) results[audio.id] = text
        }
      } catch {
        // ignora silenciosamente — não bloqueia a análise
      }
    })
  )

  return results
}
