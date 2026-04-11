/**
 * Descrição de imagens via IA (Vision).
 * Usa o provedor ativo configurado em Settings.
 * Suporte: OpenAI GPT-4o, Anthropic Claude, Google Gemini.
 */
import { prisma } from "@/lib/prisma"

const VISION_PROMPT =
  "Descreva de forma concisa o que está nesta imagem, em português do Brasil. " +
  "Foque em elementos relevantes para uma conversa de vendas: produtos, documentos, textos visíveis, pessoas, locais."

interface ProviderConfig {
  provider: string
  apiKey: string
  model: string
}

async function getActiveProvider(): Promise<ProviderConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "aiDefaultProvider",
          "openaiKey", "openaiModel",
          "anthropicKey", "anthropicModel",
          "geminiKey", "geminiModel",
          "grokKey", "grokModel",
        ],
      },
    },
  })

  const s: Record<string, string> = {}
  for (const row of settings) s[row.key] = row.value

  const provider = s.aiDefaultProvider || "openai"
  const keyMap: Record<string, string> = {
    openai:    s.openaiKey    || process.env.OPENAI_API_KEY    || "",
    anthropic: s.anthropicKey || process.env.ANTHROPIC_API_KEY || "",
    gemini:    s.geminiKey    || process.env.GEMINI_API_KEY    || "",
    grok:      s.grokKey      || process.env.GROK_API_KEY      || "",
  }
  const modelMap: Record<string, string> = {
    openai:    s.openaiModel    || "gpt-4o",
    anthropic: s.anthropicModel || "claude-sonnet-4-6",
    gemini:    s.geminiModel    || "gemini-2.0-flash",
    grok:      s.grokModel      || "grok-3",
  }

  return { provider, apiKey: keyMap[provider] || "", model: modelMap[provider] || "" }
}

async function describeWithOpenAI(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" } },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI vision error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

async function describeWithAnthropic(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic vision error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text || ""
}

async function describeWithGemini(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: VISION_PROMPT },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 300 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini vision error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

export async function describeImage(
  imageBuffer: Buffer,
  mimeType = "image/jpeg"
): Promise<string | null> {
  try {
    const { provider, apiKey, model } = await getActiveProvider()
    if (!apiKey) {
      console.warn("[Vision] Chave de API não configurada — visão ignorada")
      return null
    }

    const imageBase64 = imageBuffer.toString("base64")

    switch (provider) {
      case "anthropic":
        return await describeWithAnthropic(imageBase64, mimeType, apiKey, model)
      case "gemini":
        return await describeWithGemini(imageBase64, mimeType, apiKey, model)
      case "grok":
        // Grok usa API compatível com OpenAI
        return await describeWithOpenAI(imageBase64, mimeType, apiKey, model)
      default:
        return await describeWithOpenAI(imageBase64, mimeType, apiKey, model)
    }
  } catch (err) {
    console.error("[Vision] Erro ao descrever imagem:", err)
    return null
  }
}
