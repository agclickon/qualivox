/**
 * Transcrição de áudio via OpenAI Whisper.
 * Usa a chave OpenAI configurada em Settings ou variável de ambiente.
 */
import { prisma } from "@/lib/prisma"

async function getOpenAIKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "openaiKey" } })
  return setting?.value || process.env.OPENAI_API_KEY || null
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  const apiKey = await getOpenAIKey()
  if (!apiKey) {
    console.warn("[Transcription] Chave OpenAI não configurada — transcrição ignorada")
    return null
  }

  try {
    const form = new FormData()
    const blob = new Blob([audioBuffer as unknown as ArrayBuffer], { type: "audio/ogg" })
    form.append("file", blob, fileName)
    form.append("model", "whisper-1")
    form.append("language", "pt")
    form.append("response_format", "text")

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Transcription] Whisper error ${res.status}:`, err)
      return null
    }

    const text = await res.text()
    return text.trim() || null
  } catch (err) {
    console.error("[Transcription] Erro ao transcrever áudio:", err)
    return null
  }
}
