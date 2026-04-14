/**
 * Google Calendar Service
 * Gerencia OAuth, criação, edição e exclusão de eventos.
 * Credenciais armazenadas no banco de dados (settings) — sem dependência de .env,
 * para suportar modelo SaaS onde cada empresa tem suas próprias credenciais OAuth.
 */
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// ── Credenciais armazenadas no banco ───────────────────────────────────────

export interface GoogleCredentials {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Busca credenciais do Google OAuth salvas pelo tenant na tabela settings.
 * Fallback para variáveis de ambiente para compatibilidade retroativa.
 */
export async function getGoogleCredentials(): Promise<GoogleCredentials | null> {
  const keys = await prisma.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM settings WHERE key IN ('googleClientId', 'googleClientSecret', 'googleRedirectUri')
  `
  const map: Record<string, string> = {}
  for (const row of keys) map[row.key] = row.value

  const clientId = map["googleClientId"] || process.env.GOOGLE_CLIENT_ID || ""
  const clientSecret = map["googleClientSecret"] || process.env.GOOGLE_CLIENT_SECRET || ""
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const redirectUri = map["googleRedirectUri"] || process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/integrations/calendar/google/callback`

  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

// ── Configuração OAuth ──────────────────────────────────────────────────────

function buildOAuthClient(creds: GoogleCredentials) {
  return new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri)
}

export async function getGoogleAuthUrl(userId: string): Promise<string> {
  const creds = await getGoogleCredentials()
  if (!creds) throw new Error("Credenciais do Google não configuradas.")
  const oauth2 = buildOAuthClient(creds)
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state: userId,
  })
}

// ── Salvar / renovar tokens ─────────────────────────────────────────────────

export async function saveGoogleTokens(
  userId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }
) {
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

  // Verifica se já existe integração para este usuário
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM calendar_integrations WHERE user_id = ${userId} AND provider = 'google'
  `

  if (existing.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE calendar_integrations
       SET access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expires_at = ?, is_active = 1, updated_at = datetime('now')
       WHERE user_id = ? AND provider = 'google'`,
      tokens.access_token ?? null,
      tokens.refresh_token ?? null,
      expiresAt,
      userId
    )
    return existing[0].id
  } else {
    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO calendar_integrations (id, user_id, provider, access_token, refresh_token, token_expires_at, created_at, updated_at)
       VALUES (?, ?, 'google', ?, ?, ?, datetime('now'), datetime('now'))`,
      id, userId, tokens.access_token ?? null, tokens.refresh_token ?? null, expiresAt
    )
    return id
  }
}

// ── Obter cliente autenticado para um usuário ───────────────────────────────

export async function getAuthedClient(userId: string) {
  const rows = await prisma.$queryRaw<{
    access_token: string | null
    refresh_token: string | null
    token_expires_at: string | null
  }[]>`
    SELECT access_token, refresh_token, token_expires_at
    FROM calendar_integrations
    WHERE user_id = ${userId} AND provider = 'google' AND is_active = 1
  `
  if (!rows.length) throw new Error("Google Calendar não conectado para este usuário.")

  const creds = await getGoogleCredentials()
  if (!creds) throw new Error("Credenciais do Google não configuradas.")
  const oauth2 = buildOAuthClient(creds)
  oauth2.setCredentials({
    access_token: rows[0].access_token,
    refresh_token: rows[0].refresh_token,
    expiry_date: rows[0].token_expires_at ? new Date(rows[0].token_expires_at).getTime() : undefined,
  })

  // Auto-renova token se expirado
  oauth2.on("tokens", async (newTokens) => {
    if (newTokens.access_token) {
      await saveGoogleTokens(userId, newTokens)
    }
  })

  return oauth2
}

// ── Verificar conexão ───────────────────────────────────────────────────────

export async function getCalendarIntegration(userId: string) {
  const rows = await prisma.$queryRaw<{
    id: string
    provider: string
    is_active: number
    calendar_id: string | null
    calendar_name: string | null
    token_expires_at: string | null
  }[]>`
    SELECT id, provider, is_active, calendar_id, calendar_name, token_expires_at
    FROM calendar_integrations
    WHERE user_id = ${userId} AND provider = 'google'
  `
  return rows[0] ?? null
}

// ── Criar evento ────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  title: string
  description?: string
  startTime: string  // ISO 8601
  endTime: string    // ISO 8601
  attendeeEmail?: string
  attendeeName?: string
  addMeetLink?: boolean
  timezone?: string
  calendarId?: string  // default "primary"
}

export interface CalendarEventResult {
  googleEventId: string
  title: string
  startTime: string
  endTime: string
  meetLink?: string
  htmlLink?: string
}

export async function createCalendarEvent(
  userId: string,
  input: CalendarEventInput,
  meta?: { leadId?: string; conversationId?: string; createdBy?: string; agentId?: string }
): Promise<CalendarEventResult> {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })

  const event: any = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.startTime, timeZone: input.timezone ?? "America/Sao_Paulo" },
    end: { dateTime: input.endTime, timeZone: input.timezone ?? "America/Sao_Paulo" },
  }

  if (input.attendeeEmail) {
    event.attendees = [{ email: input.attendeeEmail, displayName: input.attendeeName }]
  }

  if (input.addMeetLink) {
    event.conferenceData = {
      createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
    }
  }

  const res = await calendar.events.insert({
    calendarId: input.calendarId ?? "primary",
    requestBody: event,
    conferenceDataVersion: input.addMeetLink ? 1 : 0,
    sendUpdates: input.attendeeEmail ? "all" : "none",
  })

  const created = res.data
  const meetLink = created.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri

  // Persiste localmente
  const integration = await getCalendarIntegration(userId)
  if (integration) {
    // Lazy migration: garante coluna agent_id
    await prisma.$executeRawUnsafe(`ALTER TABLE calendar_events ADD COLUMN agent_id TEXT`).catch(() => {})
    const localId = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO calendar_events
       (id, user_id, lead_id, conversation_id, integration_id, google_event_id, title, description,
        start_time, end_time, attendee_email, attendee_name, meet_link, status, created_by, agent_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, datetime('now'), datetime('now'))`,
      localId, userId,
      meta?.leadId ?? null, meta?.conversationId ?? null,
      integration.id, created.id ?? null,
      input.title, input.description ?? null,
      input.startTime, input.endTime,
      input.attendeeEmail ?? null, input.attendeeName ?? null,
      meetLink ?? null,
      meta?.createdBy ?? "agent",
      meta?.agentId ?? null
    )
  }

  return {
    googleEventId: created.id!,
    title: created.summary ?? input.title,
    startTime: created.start?.dateTime ?? input.startTime,
    endTime: created.end?.dateTime ?? input.endTime,
    meetLink: meetLink ?? undefined,
    htmlLink: created.htmlLink ?? undefined,
  }
}

// ── Editar evento ───────────────────────────────────────────────────────────

export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  updates: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })

  const patch: any = {}
  if (updates.title) patch.summary = updates.title
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.startTime) patch.start = { dateTime: updates.startTime, timeZone: updates.timezone ?? "America/Sao_Paulo" }
  if (updates.endTime) patch.end = { dateTime: updates.endTime, timeZone: updates.timezone ?? "America/Sao_Paulo" }
  if (updates.attendeeEmail) patch.attendees = [{ email: updates.attendeeEmail, displayName: updates.attendeeName }]

  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId: googleEventId,
    requestBody: patch,
    sendUpdates: updates.attendeeEmail ? "all" : "none",
  })

  const updated = res.data
  const meetLink = updated.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri

  // Atualiza localmente
  await prisma.$executeRawUnsafe(
    `UPDATE calendar_events SET
       title = COALESCE(?, title),
       start_time = COALESCE(?, start_time),
       end_time = COALESCE(?, end_time),
       updated_at = datetime('now')
     WHERE google_event_id = ? AND user_id = ?`,
    updates.title ?? null, updates.startTime ?? null, updates.endTime ?? null,
    googleEventId, userId
  )

  return {
    googleEventId: updated.id!,
    title: updated.summary ?? updates.title ?? "",
    startTime: updated.start?.dateTime ?? updates.startTime ?? "",
    endTime: updated.end?.dateTime ?? updates.endTime ?? "",
    meetLink: meetLink ?? undefined,
    htmlLink: updated.htmlLink ?? undefined,
  }
}

// ── Excluir evento ──────────────────────────────────────────────────────────

export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<void> {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })

  await calendar.events.delete({ calendarId: "primary", eventId: googleEventId, sendUpdates: "all" })

  await prisma.$executeRawUnsafe(
    `UPDATE calendar_events SET status = 'cancelled', updated_at = datetime('now')
     WHERE google_event_id = ? AND user_id = ?`,
    googleEventId, userId
  )
}

// ── Listar próximos eventos ─────────────────────────────────────────────────

export async function listUpcomingEvents(userId: string, maxResults = 10) {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  })

  return (res.data.items ?? []).map((e) => ({
    googleEventId: e.id,
    title: e.summary,
    startTime: e.start?.dateTime ?? e.start?.date,
    endTime: e.end?.dateTime ?? e.end?.date,
    meetLink: e.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri,
    htmlLink: e.htmlLink,
    attendees: e.attendees?.map((a) => ({ email: a.email, name: a.displayName })) ?? [],
  }))
}

// ── Listar calendários do usuário ───────────────────────────────────────────

export interface GoogleCalendar {
  id: string
  name: string
  color: string
  primary: boolean
}

export async function listCalendars(userId: string): Promise<GoogleCalendar[]> {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })
  const res = await calendar.calendarList.list({ showHidden: false })
  return (res.data.items ?? []).map((c) => ({
    id: c.id!,
    name: c.summary ?? "(sem nome)",
    color: c.backgroundColor ?? "#4285f4",
    primary: Boolean(c.primary),
  }))
}

// ── Listar eventos do Google Calendar por intervalo de datas ────────────────

export async function getEventsForRange(
  userId: string,
  timeMin: string,
  timeMax: string,
  calendarIds: string[] = ["primary"]
) {
  const auth = await getAuthedClient(userId)
  const calendar = google.calendar({ version: "v3", auth })

  const allEvents: {
    id: string; google_event_id: string | null; calendar_id: string
    title: string; start_time: string; end_time: string
    meet_link: string | null; attendee_name: string | null; attendee_email: string | null
    status: string; created_by: string; lead_id: null; conversation_id: null; agent_id: null
  }[] = []

  for (const calId of calendarIds) {
    try {
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      })

      for (const e of res.data.items ?? []) {
        allEvents.push({
          id: e.id ?? crypto.randomUUID(),
          google_event_id: e.id ?? null,
          calendar_id: calId,
          title: e.summary ?? "(sem título)",
          start_time: e.start?.dateTime ?? e.start?.date ?? "",
          end_time: e.end?.dateTime ?? e.end?.date ?? "",
          meet_link: e.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ?? null,
          attendee_name: e.attendees?.[0]?.displayName ?? null,
          attendee_email: e.attendees?.[0]?.email ?? null,
          status: e.status === "cancelled" ? "cancelled" : "confirmed",
          created_by: "google",
          lead_id: null,
          conversation_id: null,
          agent_id: null,
        })
      }
    } catch {
      // Ignora erros por calendário individual (ex: sem permissão)
    }
  }

  return allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}

// ── Verificar disponibilidade (freebusy) ────────────────────────────────────

export async function getBusySlotsForRange(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  try {
    const auth = await getAuthedClient(userId)
    const calendar = google.calendar({ version: "v3", auth })
    const res = await (calendar.freebusy as any).query({
      requestBody: { timeMin, timeMax, items: [{ id: "primary" }] },
    })
    return (res.data.calendars?.primary?.busy ?? []) as { start: string; end: string }[]
  } catch {
    return []
  }
}

// ── Buscar evento desta conversa criado por este agente ─────────────────────

export async function getEventByConversationAndAgent(
  conversationId: string,
  agentId: string
): Promise<{ id: string; google_event_id: string | null; title: string; start_time: string; end_time: string } | null> {
  // Lazy migration: adiciona coluna agent_id se ainda não existir
  await prisma.$executeRawUnsafe(`ALTER TABLE calendar_events ADD COLUMN agent_id TEXT`).catch(() => {})

  const rows = await prisma.$queryRaw<{
    id: string
    google_event_id: string | null
    title: string
    start_time: string
    end_time: string
  }[]>`
    SELECT id, google_event_id, title, start_time, end_time
    FROM calendar_events
    WHERE conversation_id = ${conversationId}
      AND agent_id = ${agentId}
      AND status != 'cancelled'
    ORDER BY start_time DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

// ── Listar eventos locais por lead/conversa ─────────────────────────────────

export async function listLocalEvents(filters: { userId?: string; leadId?: string; conversationId?: string }) {
  const conditions: string[] = ["status != 'cancelled'"]
  const values: unknown[] = []

  if (filters.userId) { conditions.push("user_id = ?"); values.push(filters.userId) }
  if (filters.leadId) { conditions.push("lead_id = ?"); values.push(filters.leadId) }
  if (filters.conversationId) { conditions.push("conversation_id = ?"); values.push(filters.conversationId) }

  const rows = await prisma.$queryRawUnsafe<{
    id: string; google_event_id: string | null; title: string
    start_time: string; end_time: string; attendee_email: string | null
    attendee_name: string | null; meet_link: string | null; status: string; created_by: string
  }[]>(
    `SELECT id, google_event_id, title, start_time, end_time, attendee_email, attendee_name, meet_link, status, created_by
     FROM calendar_events WHERE ${conditions.join(" AND ")} ORDER BY start_time ASC`,
    ...values
  )

  return rows
}
