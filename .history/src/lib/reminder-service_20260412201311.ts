/**
 * Serviço de lembretes de eventos do calendário
 *
 * Responsável por:
 * 1. Ler configurações de lembrete (definidas pelo super admin)
 * 2. Agendar lembretes quando um evento é criado
 * 3. Cancelar lembretes quando um evento é cancelado
 */

import { prisma } from "@/lib/prisma"
import { getPrismaForConnection } from "@/lib/prisma-tenant"
import crypto from "crypto"
import type { PrismaClient } from "@prisma/client"

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ReminderSettings {
  enabled: boolean
  reminder1Enabled: boolean
  reminder1HoursBefore: number
  reminder1Message: string
  reminder2Enabled: boolean
  reminder2HoursBefore: number
  reminder2Message: string
}

export const DEFAULT_REMINDER_MESSAGE_1 =
  "Olá {lead_name}! 📅 Lembrando que você tem *{title}* agendado para *{date}*.\n\nConfirme sua presença respondendo *SIM* para confirmar ou *NÃO* para cancelar."

export const DEFAULT_REMINDER_MESSAGE_2 =
  "Olá {lead_name}! ⏰ Em {hours_before}h começa *{title}*. Até logo!"

// ── Lazy migration da tabela ───────────────────────────────────────────────────

async function ensureReminderTable(db: PrismaClient = prisma) {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS event_reminders (
      id TEXT PRIMARY KEY,
      calendar_event_id TEXT,
      google_event_id TEXT,
      lead_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      agent_id TEXT,
      connection_id TEXT,
      reminder_type TEXT NOT NULL DEFAULT 'reminder_1',
      hours_before INTEGER NOT NULL DEFAULT 24,
      send_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_event_reminders_send_at ON event_reminders (status, send_at)`
  ).catch(() => {})
}

// ── Leitura das configurações ─────────────────────────────────────────────────

export async function getReminderSettings(db: PrismaClient = prisma): Promise<ReminderSettings> {
  const rows = await db.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM settings
    WHERE key IN (
      'eventReminderEnabled',
      'eventReminder1Enabled', 'eventReminder1HoursBefore', 'eventReminder1Message',
      'eventReminder2Enabled', 'eventReminder2HoursBefore', 'eventReminder2Message'
    )
  `
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value

  return {
    enabled: map.eventReminderEnabled === "true",
    reminder1Enabled: map.eventReminder1Enabled !== "false",
    reminder1HoursBefore: Number(map.eventReminder1HoursBefore ?? 24),
    reminder1Message: map.eventReminder1Message || DEFAULT_REMINDER_MESSAGE_1,
    reminder2Enabled: map.eventReminder2Enabled !== "false",
    reminder2HoursBefore: Number(map.eventReminder2HoursBefore ?? 1),
    reminder2Message: map.eventReminder2Message || DEFAULT_REMINDER_MESSAGE_2,
  }
}

// ── Agendamento de lembretes para um evento ───────────────────────────────────

export interface ScheduleRemindersParams {
  calendarEventId: string
  googleEventId: string | null
  leadId: string
  conversationId: string
  agentId: string
  connectionId: string
  eventStartTime: string
  leadName: string
  eventTitle: string
}

export async function scheduleEventReminders(params: ScheduleRemindersParams, db?: PrismaClient): Promise<void> {
  const tenantDb = db ?? (params.connectionId ? await getPrismaForConnection(params.connectionId) : prisma)
  const settings = await getReminderSettings(tenantDb)
  if (!settings.enabled) return

  await ensureReminderTable(tenantDb)

  const startTime = new Date(params.eventStartTime)
  const now = new Date()

  const reminders = [
    {
      type: "reminder_1",
      enabled: settings.reminder1Enabled,
      hoursBefore: settings.reminder1HoursBefore,
      message: settings.reminder1Message,
    },
    {
      type: "reminder_2",
      enabled: settings.reminder2Enabled,
      hoursBefore: settings.reminder2HoursBefore,
      message: settings.reminder2Message,
    },
  ]

  for (const r of reminders) {
    if (!r.enabled) continue

    const sendAt = new Date(startTime.getTime() - r.hoursBefore * 60 * 60 * 1000)
    if (sendAt <= now) {
      console.log(`[ReminderService] Lembrete ${r.type} ignorado — horário já passou (${sendAt.toISOString()})`)
      continue
    }

    const dateFormatted = startTime.toLocaleString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
    })

    const message = r.message
      .replace(/\{lead_name\}/g, params.leadName)
      .replace(/\{title\}/g, params.eventTitle)
      .replace(/\{date\}/g, dateFormatted)
      .replace(/\{hours_before\}/g, String(r.hoursBefore))

    const id = crypto.randomUUID()
    await tenantDb.$executeRawUnsafe(
      `INSERT INTO event_reminders
       (id, calendar_event_id, google_event_id, lead_id, conversation_id, agent_id, connection_id,
        reminder_type, hours_before, send_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
      id,
      params.calendarEventId,
      params.googleEventId ?? null,
      params.leadId,
      params.conversationId,
      params.agentId,
      params.connectionId,
      r.type,
      r.hoursBefore,
      sendAt.toISOString()
    )

    console.log(
      `[ReminderService] ✓ Lembrete "${r.type}" agendado para ${sendAt.toISOString()} ` +
      `(${r.hoursBefore}h antes de "${params.eventTitle}")`
    )
  }
}

// ── Cancelar lembretes de um evento ──────────────────────────────────────────

export async function cancelEventReminders(googleEventId: string, db: PrismaClient = prisma): Promise<void> {
  await ensureReminderTable(db)
  await db.$executeRawUnsafe(
    `UPDATE event_reminders SET status = 'cancelled', updated_at = datetime('now')
     WHERE google_event_id = ? AND status = 'pending'`,
    googleEventId
  )
}

// ── Listar lembretes pendentes ────────────────────────────────────────────────

export async function listPendingReminders(db: PrismaClient = prisma) {
  await ensureReminderTable(db)
  const now = new Date().toISOString()
  return db.$queryRaw<{
    id: string
    calendar_event_id: string | null
    google_event_id: string | null
    lead_id: string
    conversation_id: string
    agent_id: string | null
    connection_id: string | null
    reminder_type: string
    hours_before: number
    send_at: string
    status: string
  }[]>`
    SELECT id, calendar_event_id, google_event_id, lead_id, conversation_id, agent_id, connection_id,
           reminder_type, hours_before, send_at, status
    FROM event_reminders
    WHERE status = 'pending' AND send_at <= ${now}
    ORDER BY send_at ASC
    LIMIT 20
  `
}

export async function markReminderSent(id: string, db: PrismaClient = prisma): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE event_reminders SET status = 'sent', updated_at = datetime('now') WHERE id = ?`,
    id
  )
}

export async function markReminderFailed(id: string, error: string, db: PrismaClient = prisma): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE event_reminders SET status = 'failed', updated_at = datetime('now') WHERE id = ?`,
    id
  )
  console.error(`[ReminderService] Lembrete ${id} falhou: ${error}`)
}
