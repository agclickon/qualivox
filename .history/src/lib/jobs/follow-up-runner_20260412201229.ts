import { getAllTenantDbs } from "@/lib/prisma-tenant"
import { sendMessageToLead } from "@/lib/whatsapp/send-message"

const RUNNER_SYMBOL = Symbol.for("followup.runner")

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
      const now = new Date()
      const tenants = await getAllTenantDbs()

      for (const { db } of tenants) {
        const pending = await db.followUp.findMany({
          where: { status: "scheduled", sendAt: { lte: now } },
          take: 10,
          orderBy: { sendAt: "asc" },
        })

        for (const item of pending) {
          try {
            const result = await sendMessageToLead({
              leadId: item.leadId,
              message: item.message,
              templateId: item.templateId || undefined,
              variables: item.templateVariables ? JSON.parse(item.templateVariables) : undefined,
              conversationId: item.conversationId,
              db,
            })

            if (result.success) {
              await db.followUp.update({
                where: { id: item.id },
                data: {
                  status: "sent",
                  sentAt: new Date(),
                  lastError: null,
                  message: result.data.finalMessage,
                },
              })
            } else {
              await db.followUp.update({
                where: { id: item.id },
                data: {
                  status: "failed",
                  lastError: result.error,
                },
              })
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao enviar follow-up"
            await db.followUp.update({
              where: { id: item.id },
              data: {
                status: "failed",
                lastError: message,
              },
            })
          }
        }
      }
    } catch (err) {
      console.error("[FollowUpRunner] erro: ", err)
    } finally {
      isRunning = false
    }
  }

  const interval = setInterval(tick, 60_000)
  tick().catch((err) => console.error("[FollowUpRunner] erro inicial:", err))

  return { interval }
}
