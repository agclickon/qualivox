/**
 * Serviço centralizado de disparo de webhooks com assinatura HMAC-SHA256,
 * log de entregas e retry automático com backoff.
 */
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

// Garante que a tabela webhook_deliveries existe (lazy migration)
async function ensureDeliveriesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      status_code INTEGER,
      response_body TEXT,
      attempt INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      next_retry_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {})
  // Adiciona coluna name à tabela webhooks se não existir
  await prisma.$executeRawUnsafe(`ALTER TABLE webhooks ADD COLUMN name TEXT NOT NULL DEFAULT ''`).catch(() => {})
}

// Atrasos de retry: imediato (attempt 1), +1min, +5min, +30min
const RETRY_DELAYS_MS = [0, 60_000, 300_000, 1_800_000]

function generateSignature(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function generateId(): string {
  return crypto.randomUUID()
}

export interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

/**
 * Dispara o evento para todos os endpoints ativos que têm o evento habilitado.
 * Persiste um registro de entrega para cada endpoint e tenta enviar.
 * Em caso de falha, agenda retry automático via backoff.
 */
export async function fireWebhook(event: string, data: Record<string, unknown>): Promise<void> {
  await ensureDeliveriesTable()

  const endpoints = await prisma.$queryRawUnsafe<{
    id: string; url: string; events: string; secret: string | null; is_active: number
  }[]>(`SELECT id, url, events, secret, is_active FROM webhooks WHERE is_active = 1`)

  const eligible = endpoints.filter((ep) => {
    try {
      const evts: string[] = JSON.parse(ep.events)
      return evts.includes(event) || evts.includes("*")
    } catch { return false }
  })

  if (eligible.length === 0) return

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data }
  const body = JSON.stringify(payload)

  await Promise.allSettled(
    eligible.map((ep) => deliverToEndpoint(ep.id, ep.url, ep.secret, event, body, 1))
  )
}

async function deliverToEndpoint(
  webhookId: string,
  url: string,
  secret: string | null,
  event: string,
  body: string,
  attempt: number
): Promise<void> {
  const deliveryId = generateId()
  const now = new Date().toISOString()

  // Cria registro de entrega como pending
  await prisma.$executeRawUnsafe(
    `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, attempt, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    deliveryId, webhookId, event, body, attempt, now, now
  )

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-LeadFlow-Event": event,
      "X-LeadFlow-Delivery": deliveryId,
    }
    if (secret) {
      headers["X-LeadFlow-Signature"] = generateSignature(secret, body)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let statusCode = 0
    let responseBody = ""
    try {
      const res = await fetch(url, { method: "POST", headers, body, signal: controller.signal })
      statusCode = res.status
      responseBody = (await res.text()).slice(0, 2000)
    } finally {
      clearTimeout(timeout)
    }

    const success = statusCode >= 200 && statusCode < 300
    const updatedAt = new Date().toISOString()

    if (success) {
      await prisma.$executeRawUnsafe(
        `UPDATE webhook_deliveries SET status = 'success', status_code = ?, response_body = ?, updated_at = ? WHERE id = ?`,
        statusCode, responseBody, updatedAt, deliveryId
      )
    } else {
      // Falha com código HTTP — agenda retry se tiver tentativas restantes
      await scheduleRetry(deliveryId, webhookId, url, secret, event, body, attempt, statusCode, responseBody)
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await scheduleRetry(deliveryId, webhookId, url, secret, event, body, attempt, 0, errMsg)
  }
}

async function scheduleRetry(
  deliveryId: string,
  webhookId: string,
  url: string,
  secret: string | null,
  event: string,
  body: string,
  attempt: number,
  statusCode: number,
  responseBody: string
) {
  const nextAttempt = attempt + 1
  const delayMs = RETRY_DELAYS_MS[attempt] ?? null // attempt 4 = sem mais retries

  const updatedAt = new Date().toISOString()

  if (delayMs !== null && nextAttempt <= RETRY_DELAYS_MS.length) {
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString()
    await prisma.$executeRawUnsafe(
      `UPDATE webhook_deliveries SET status = 'failed', status_code = ?, response_body = ?, next_retry_at = ?, updated_at = ? WHERE id = ?`,
      statusCode || null, responseBody, nextRetryAt, updatedAt, deliveryId
    )
    // Retry assíncrono com delay
    setTimeout(() => {
      deliverToEndpoint(webhookId, url, secret, event, body, nextAttempt).catch(() => {})
    }, delayMs)
  } else {
    // Esgotou as tentativas
    await prisma.$executeRawUnsafe(
      `UPDATE webhook_deliveries SET status = 'failed', status_code = ?, response_body = ?, updated_at = ? WHERE id = ?`,
      statusCode || null, responseBody, updatedAt, deliveryId
    )
  }
}

/**
 * Reenvio manual de uma entrega já registrada.
 */
export async function retryDelivery(deliveryId: string): Promise<void> {
  await ensureDeliveriesTable()

  const rows = await prisma.$queryRawUnsafe<{
    id: string; webhook_id: string; event: string; payload: string; attempt: number
  }[]>(
    `SELECT d.id, d.webhook_id, d.event, d.payload, d.attempt, w.url, w.secret
     FROM webhook_deliveries d
     JOIN webhooks w ON w.id = d.webhook_id
     WHERE d.id = ?`,
    deliveryId
  ) as {
    id: string; webhook_id: string; event: string; payload: string; attempt: number; url: string; secret: string | null
  }[]

  if (!rows[0]) throw new Error("Entrega não encontrada")
  const d = rows[0]

  // Reenvio imediato sem limite de tentativas
  await deliverToEndpoint(d.webhook_id, d.url, d.secret, d.event, d.payload, d.attempt + 1)
}

/**
 * Monta payload enriquecido de conversão de lead.
 */
export async function buildLeadConvertedPayload(leadId: string, source: "manual" | "automatic"): Promise<Record<string, unknown>> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      l.*,
      ps.name as pipeline_stage_name,
      ps.color as pipeline_stage_color,
      u.name as assigned_to_name,
      u.email as assigned_to_email
    FROM leads l
    LEFT JOIN pipeline_stages ps ON ps.id = l.pipeline_stage_id
    LEFT JOIN users u ON u.id = l.assigned_to_id
    WHERE l.id = ?
  `, leadId)

  const lead = rows[0]
  if (!lead) throw new Error("Lead não encontrado")

  // Notas / anotações da timeline
  const interactions = await prisma.$queryRawUnsafe<{ type: string; content: string; created_at: string }[]>(
    `SELECT type, content, created_at FROM interactions WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50`,
    leadId
  )

  // Análise IA mais recente
  const aiRow = await prisma.$queryRawUnsafe<{ sentiment_score: number | null; classification: string | null; extracted_data: string | null; created_at: string }[]>(
    `SELECT sentiment_score, classification, extracted_data, created_at FROM ai_analyses WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1`,
    leadId
  )

  // Tags
  const tags = await prisma.$queryRawUnsafe<{ name: string; color_hex: string }[]>(
    `SELECT t.name, t.color_hex FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = ?`,
    leadId
  )

  return {
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      whatsappNumber: lead.whatsapp_number,
      status: lead.status,
      lifecycleStage: lead.lifecycle_stage,
      score: lead.score,
      qualificationLevel: lead.qualification_level,
      source: lead.source,
      companyName: lead.company_name,
      position: lead.position,
      budgetCents: lead.budget_cents,
      urgency: lead.urgency,
      notes: lead.notes,
      convertedToClientAt: lead.converted_to_client_at,
      createdAt: lead.created_at,
      pipelineStage: lead.pipeline_stage_name ? {
        name: lead.pipeline_stage_name,
        color: lead.pipeline_stage_color,
      } : null,
      assignedTo: lead.assigned_to_name ? {
        name: lead.assigned_to_name,
        email: lead.assigned_to_email,
      } : null,
      tags: tags.map((t) => ({ name: t.name, color: t.color_hex })),
    },
    notes: interactions.map((i) => ({ type: i.type, content: i.content, date: i.created_at })),
    aiAnalysis: aiRow[0] ? {
      sentimentScore: aiRow[0].sentiment_score,
      classification: aiRow[0].classification,
      extractedData: aiRow[0].extracted_data ? (() => { try { return JSON.parse(aiRow[0].extracted_data as string) } catch { return null } })() : null,
      analyzedAt: aiRow[0].created_at,
    } : null,
    source,
    convertedAt: new Date().toISOString(),
  }
}
