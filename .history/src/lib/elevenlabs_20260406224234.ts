/**
 * Integração ElevenLabs — Text-to-Speech
 * Síntese de voz para respostas do agente via WhatsApp (áudio PTT)
 */

import { prisma } from "@/lib/prisma"

const BASE_URL = "https://api.elevenlabs.io/v1"

// ── Busca API key nas configurações ─────────────────────────────────────────

export async function getElevenLabsKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "elevenLabsKey" } })
  return setting?.value || process.env.ELEVENLABS_API_KEY || null
}

// ── Lista de vozes disponíveis na conta ──────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category: string
  labels: Record<string, string>
  preview_url: string | null
}

export async function listVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  const res = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  })
  if (!res.ok) throw new Error(`ElevenLabs voices error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.voices || []
}

// ── Síntese de texto para áudio ───────────────────────────────────────────────

export interface TTSOptions {
  voiceId: string
  text: string
  apiKey: string
  modelId?: string
  stability?: number
  similarityBoost?: number
}

export async function textToSpeech(opts: TTSOptions): Promise<Buffer> {
  const {
    voiceId,
    text,
    apiKey,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = opts

  const res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`ElevenLabs TTS error ${res.status}: ${errorText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Decide se deve sintetizar voz para esta mensagem ────────────────────────

/**
 * Retorna:
 *  true   → usar voz
 *  false  → usar texto
 *  null   → modo "smart": o LLM decidiu (ver useVoiceByAgent no orquestrador)
 */
export function shouldUseVoice(
  voiceEnabled: boolean,
  voiceMode: string,
  incomingMessageHadAudio: boolean,
  agentDecidedVoice?: boolean
): boolean {
  if (!voiceEnabled) return false
  if (voiceMode === "always") return true
  if (voiceMode === "never") return false
  if (voiceMode === "if_audio") return incomingMessageHadAudio
  if (voiceMode === "smart") return agentDecidedVoice ?? false
  return false
}

/** Instrução extra injetada no system prompt quando modo é "smart" */
export const SMART_VOICE_INSTRUCTION = `
## Resposta em Voz
Você pode optar por responder com um áudio em vez de texto quando julgar estratégico — por exemplo: para criar conexão emocional, após silêncio prolongado do lead, ao fazer uma oferta importante ou para chamar atenção em momento decisivo.
Quando decidir usar voz, inclua no JSON da resposta o campo: "useVoice": true
Caso contrário, omita o campo ou use "useVoice": false
`.trim()
