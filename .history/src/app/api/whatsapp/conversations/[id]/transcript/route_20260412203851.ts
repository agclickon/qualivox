import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { resolveMediaPath } from "@/lib/media-storage"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

async function getOpenAIKey(prisma: any): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "openaiKey" } })
    return setting?.value || process.env.OPENAI_API_KEY || null
  } catch {
    return process.env.OPENAI_API_KEY || null
  }
}

async function transcribeAudioBuffer(buffer: Buffer, mimeType: string, apiKey: string): Promise<string | null> {
  try {
    const ext = mimeType.includes("mp3") ? "mp3" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "ogg"
    const form = new FormData()
    const blob = new Blob([buffer as unknown as ArrayBuffer], { type: mimeType || "audio/ogg" })
    form.append("file", blob, `audio.${ext}`)
    form.append("model", "whisper-1")
    form.append("language", "pt")
    form.append("response_format", "text")

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!res.ok) return null
    const text = await res.text()
    return text.trim() || null
  } catch {
    return null
  }
}

async function generateSummaryAndAnalysis(
  transcript: string,
  leadName: string,
  agentName: string,
  apiKey: string
): Promise<{ summary: string; analysis: string }> {
  try {
    const prompt = `Você é um analista de atendimento ao cliente. Analise a seguinte transcrição de conversa entre "${leadName}" (lead/cliente) e "${agentName}" (atendente/agente).

TRANSCRIÇÃO:
${transcript}

Responda em JSON com exatamente estas duas chaves:
{
  "summary": "Resumo objetivo da conversa em 3-5 frases: o que o lead queria, o que foi tratado, o resultado.",
  "analysis": "Análise detalhada: tom da conversa, nível de satisfação do lead, pontos positivos do atendimento, pontos de melhoria, oportunidades identificadas e próximos passos sugeridos."
}`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    })

    if (!res.ok) return { summary: "Resumo não disponível.", analysis: "Análise não disponível." }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return { summary: "Resumo não disponível.", analysis: "Análise não disponível." }
    const parsed = JSON.parse(content)
    return {
      summary: parsed.summary || "Resumo não disponível.",
      analysis: parsed.analysis || "Análise não disponível.",
    }
  } catch {
    return { summary: "Resumo não disponível.", analysis: "Análise não disponível." }
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

// GET /api/whatsapp/conversations/[id]/transcript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  const conversationId = params.id

  try {
    // Busca conversa com lead e atendente via raw SQL (evita problemas de schema no tenant)
    const convRows = await prisma.$queryRawUnsafe<{
      conv_id: string
      connection_id: string | null
      lead_name: string | null
      assigned_name: string | null
    }[]>(
      `SELECT c.id as conv_id, c.connection_id,
              l.name as lead_name,
              u.name as assigned_name
       FROM conversations c
       LEFT JOIN leads l ON l.id = c.lead_id
       LEFT JOIN users u ON u.id = c.assigned_to_id
       WHERE c.id = ? LIMIT 1`,
      conversationId
    )

    if (!convRows[0]) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })
    }

    const convInfo = convRows[0]
    const leadName = convInfo.lead_name || "Lead"

    // Busca mensagens via raw SQL
    const messages = await prisma.$queryRawUnsafe<{
      id: string
      direction: string
      content: string | null
      created_at: string
      message_type: string | null
      media_url: string | null
      metadata: string | null
    }[]>(
      `SELECT id, direction, content, created_at, message_type, media_url, metadata
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      conversationId
    )

    // Determina nome do agente/atendente
    let agentName = convInfo.assigned_name || "Atendente"
    if (!convInfo.assigned_name) {
      try {
        const connId = convInfo.connection_id
        const agentRows = await prisma.$queryRawUnsafe<{ name: string }[]>(
          connId
            ? `SELECT a.name FROM agents a WHERE a.is_active = 1 AND (a.connection_ids LIKE ? OR a.connection_ids = '[]') LIMIT 1`
            : `SELECT name FROM agents WHERE is_active = 1 LIMIT 1`,
          ...(connId ? [`%${connId}%`] : [])
        )
        if (agentRows[0]?.name) agentName = agentRows[0].name
      } catch { /* ignora */ }
    }

    // Adapta para interface interna
    const conv = { messages, lead: { name: leadName } }

    const apiKey = await getOpenAIKey(prisma)

    // Monta linhas da transcrição processando áudios com Whisper
    const lines: string[] = []
    let hasAudio = false

    for (const msg of conv.messages) {
      const ts = formatDateTime(msg.created_at)
      const speaker = msg.direction === "incoming" ? leadName : agentName
      const type: string = msg.message_type || "text"

      if ((type === "audio" || type === "voice" || type === "ptt") && msg.media_url) {
        hasAudio = true
        let transcription = "[Áudio não transcrito]"

        if (apiKey) {
          try {
            let meta: Record<string, unknown> = {}
            try { meta = msg.metadata ? JSON.parse(msg.metadata as string) : {} } catch { /* */ }

            const mimeType = (meta.mimeType as string) || "audio/ogg"
            const filePath = resolveMediaPath(msg.media_url!)

            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath)
              const result = await transcribeAudioBuffer(buffer, mimeType, apiKey)
              if (result) transcription = result
            }
          } catch (err) {
            console.error(`[Transcript] Erro ao transcrever áudio ${msg.id}:`, err)
          }
        }

        lines.push(`[${ts}] ${speaker} (🎙️ Áudio): ${transcription}`)
      } else if (type === "image") {
        lines.push(`[${ts}] ${speaker} (📷 Imagem)${msg.content ? `: ${msg.content}` : ""}`)
      } else if (type === "video") {
        lines.push(`[${ts}] ${speaker} (🎬 Vídeo)${msg.content ? `: ${msg.content}` : ""}`)
      } else if (type === "document") {
        let meta: Record<string, unknown> = {}
        try { meta = msg.metadata ? JSON.parse(msg.metadata as string) : {} } catch { /* */ }
        const filename = (meta.file_name as string) || (meta.filename as string) || "arquivo"
        lines.push(`[${ts}] ${speaker} (📄 Documento: ${filename})`)
      } else if (msg.content?.trim()) {
        lines.push(`[${ts}] ${speaker}: ${msg.content}`)
      }
    }

    const fullTranscript = lines.join("\n")

    // Gera resumo e análise via GPT
    let summary = "Resumo não disponível (chave OpenAI não configurada)."
    let analysis = "Análise não disponível (chave OpenAI não configurada)."

    if (apiKey && lines.length > 0) {
      const result = await generateSummaryAndAnalysis(fullTranscript, leadName, agentName, apiKey)
      summary = result.summary
      analysis = result.analysis
    }

    // Monta arquivo .txt final
    const now = formatDateTime(new Date().toISOString())
    const startedAt = messages[0] ? formatDateTime(messages[0].created_at) : "—"
    const endedAt = messages.at(-1) ? formatDateTime(messages.at(-1)!.created_at) : "—"
    const totalMessages = messages.length
    const audioNote = hasAudio && !apiKey
      ? "\n⚠️  Áudios não foram transcritos (chave OpenAI não configurada em Configurações).\n"
      : ""

    const separator = "═".repeat(70)

    const txt = [
      separator,
      `  TRANSCRIÇÃO DO ATENDIMENTO`,
      separator,
      ``,
      `Lead/Cliente : ${leadName}`,
      `Atendente    : ${agentName}`,
      `Início       : ${startedAt}`,
      `Fim          : ${endedAt}`,
      `Total de msgs: ${totalMessages}`,
      `Gerado em    : ${now}`,
      audioNote,
      ``,
      separator,
      `  RESUMO DA CONVERSA`,
      separator,
      ``,
      summary,
      ``,
      separator,
      `  ANÁLISE DO ATENDIMENTO`,
      separator,
      ``,
      analysis,
      ``,
      separator,
      `  TRANSCRIÇÃO COMPLETA`,
      separator,
      ``,
      fullTranscript || "(Sem mensagens de texto nesta conversa)",
      ``,
      separator,
    ].join("\n")

    // Sanitiza nome do lead para usar no filename
    const safeName = leadName.replace(/[^a-zA-Z0-9À-ÿ\s]/g, "").replace(/\s+/g, "_").slice(0, 40)
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `transcricao_${safeName}_${dateStr}.txt`

    return new NextResponse(txt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[Transcript] Erro:", err)
    return NextResponse.json({ success: false, error: "Erro ao gerar transcrição" }, { status: 500 })
  }
}
