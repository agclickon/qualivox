/**
 * Módulo unificado de IA — suporta OpenAI, Anthropic, Gemini, Grok e DeepSeek.
 * Lê o provedor e modelo ativos na tabela Settings.
 */
import { prisma } from "@/lib/prisma"

export interface AiMessage {
  role: "system" | "user" | "assistant"
  content: string
}

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
          "deepseekKey", "deepseekModel",
        ],
      },
    },
  })

  const s: Record<string, string> = {}
  for (const row of settings) s[row.key] = row.value

  const provider = s.aiDefaultProvider || "openai"
  const keyMap: Record<string, string> = {
    openai: s.openaiKey || process.env.OPENAI_API_KEY || "",
    anthropic: s.anthropicKey || process.env.ANTHROPIC_API_KEY || "",
    gemini: s.geminiKey || process.env.GEMINI_API_KEY || "",
    grok: s.grokKey || process.env.GROK_API_KEY || "",
    deepseek: s.deepseekKey || process.env.DEEPSEEK_API_KEY || "",
  }
  const modelMap: Record<string, string> = {
    openai: s.openaiModel || "gpt-4o-mini",
    anthropic: s.anthropicModel || "claude-sonnet-4-6",
    gemini: s.geminiModel || "gemini-2.0-flash",
    grok: s.grokModel || "grok-3-mini",
    deepseek: s.deepseekModel || "deepseek-chat",
  }

  return { provider, apiKey: keyMap[provider] || "", model: modelMap[provider] || "" }
}

// ── Chamadas por provider ───────────────────────────────────────────────────

async function callOpenAI(messages: AiMessage[], apiKey: string, model: string, temperature: number, jsonMode = false): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 2000, ...(jsonMode ? { response_format: { type: "json_object" } } : {}) }),
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0]?.message?.content || ""
}

async function callAnthropic(messages: AiMessage[], apiKey: string, model: string, temperature: number): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content || ""
  const userMessages = messages.filter((m) => m.role !== "system")
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system, messages: userMessages, max_tokens: 2000, temperature }),
  })
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text || ""
}

async function callGemini(messages: AiMessage[], apiKey: string, model: string, temperature: number, jsonMode = false): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }))
  const systemInstruction = messages.find((m) => m.role === "system")?.content
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: 2000, ...(jsonMode ? { responseMimeType: "application/json" } : {}) },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

async function callGrok(messages: AiMessage[], apiKey: string, model: string, temperature: number): Promise<string> {
  // Grok usa API compatível com OpenAI
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 2000 }),
  })
  if (!res.ok) throw new Error(`Grok error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0]?.message?.content || ""
}

async function callDeepSeek(messages: AiMessage[], apiKey: string, model: string, temperature: number): Promise<string> {
  // DeepSeek usa API compatível com OpenAI
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: 2000 }),
  })
  if (!res.ok) throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0]?.message?.content || ""
}

// ── Função pública ──────────────────────────────────────────────────────────

export async function aiChat(messages: AiMessage[], temperature = 0.3, jsonMode = false): Promise<string> {
  const { provider, apiKey, model } = await getActiveProvider()

  if (!apiKey) throw new Error(`Chave de API não configurada para o provedor "${provider}". Configure em Configurações → Integrações.`)

  switch (provider) {
    case "anthropic": return callAnthropic(messages, apiKey, model, temperature)
    case "gemini":    return callGemini(messages, apiKey, model, temperature, jsonMode)
    case "grok":      return callGrok(messages, apiKey, model, temperature)
    case "deepseek":  return callDeepSeek(messages, apiKey, model, temperature)
    default:          return callOpenAI(messages, apiKey, model, temperature, jsonMode)
  }
}
