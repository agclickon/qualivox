/**
 * Reminder Runner — processa lembretes de eventos pendentes
 *
 * Roda via setInterval a cada 60s (mesmo padrão do follow-up-runner).
 * Ao disparar, envia a mensagem de confirmação/lembrete via WhatsApp para o lead.
 * O agente irá processar a resposta naturalmente pela conversa existente.
 */

import { listPendingReminders, markReminderSent, markReminderFailed } from "@/lib/reminder-service"
import { sendMessageToLead } from "@/lib/whatsapp/send-message"

const RUNNER_SYMBOL = Symbol.for("reminder.runner")

if (!(RUNNER_SYMBOL in globalThis)) {
  const runner = createRunner()
  ;(globalThis as any)[RUNNER_SYMBOL] = runner
}

function createRunner() {
  let isRunning = false

  const tick = async () => {
    if (isRunning) return
    isRunning = true
    try {
      const pending = await listPendingReminders()

      for (const reminder of pending) {
        try {
          // Busca a mensagem pré-formatada armazenada? Não — a mensagem é calculada
          // em scheduleEventReminders. Aqui relemos o reminder e usamos o ID para buscar
          // a mensagem do banco. Na atual implementação armazenamos o reminder sem a
          // mensagem formatada, então precisamos reconstruir.
          //
          // Alternativa mais simples: armazenar a mensagem no banco diretamente.
          // Por ora, buscamos o template novamente.
          const { getReminderSettings } = await import("@/lib/reminder-service")
          const { prisma } = await import("@/lib/prisma")

          // Busca dados do lead e do evento para formatar a mensagem
          const leadRows = await prisma.$queryRaw<{ name: string }[]>`
            SELECT name FROM leads WHERE id = ${reminder.lead_id} LIMIT 1
          `
          const leadName = leadRows[0]?.name ?? "você"

          // Busca título do evento
          let eventTitle = "sua reunião"
          let eventStartTime = ""
          if (reminder.google_event_id) {
            const evtRows = await prisma.$queryRawUnsafe<{ title: string; start_time: string }[]>(
              `SELECT title, start_time FROM calendar_events WHERE google_event_id = ? LIMIT 1`,
              reminder.google_event_id
            )
            eventTitle = evtRows[0]?.title ?? "sua reunião"
            eventStartTime = evtRows[0]?.start_time ?? ""
          }

          const settings = await getReminderSettings()
          const isReminder1 = reminder.reminder_type === "reminder_1"
          const messageTemplate = isReminder1 ? settings.reminder1Message : settings.reminder2Message

          const dateFormatted = eventStartTime
            ? new Date(eventStartTime).toLocaleString("pt-BR", {
                weekday: "long", day: "2-digit", month: "long",
                hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
              })
            : ""

          const message = messageTemplate
            .replace(/\{lead_name\}/g, leadName)
            .replace(/\{title\}/g, eventTitle)
            .replace(/\{date\}/g, dateFormatted)
            .replace(/\{hours_before\}/g, String(reminder.hours_before))

          const result = await sendMessageToLead({
            leadId: reminder.lead_id,
            message,
            conversationId: reminder.conversation_id,
          })

          if (result.success) {
            await markReminderSent(reminder.id)
            console.log(
              `[ReminderRunner] ✓ Lembrete "${reminder.reminder_type}" enviado para lead ${reminder.lead_id}`
            )
          } else {
            await markReminderFailed(reminder.id, result.error)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido"
          await markReminderFailed(reminder.id, msg)
        }
      }
    } catch (err) {
      console.error("[ReminderRunner] erro:", err)
    } finally {
      isRunning = false
    }
  }

  const interval = setInterval(tick, 60_000)
  tick().catch((err) => console.error("[ReminderRunner] erro inicial:", err))

  return { interval }
}
