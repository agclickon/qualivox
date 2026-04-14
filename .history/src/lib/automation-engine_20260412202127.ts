import { prisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { sendTextMessage } from "@/lib/baileys-sender"

const N8N_URL = process.env.N8N_URL || ""

function formatToJid(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return `${digits}@s.whatsapp.net`
}

interface TriggerData {
  event: string
  leadId: string
  leadName?: string
  leadPhone?: string
  leadEmail?: string
  [key: string]: unknown
}

export async function executeAutomations(triggerData: TriggerData, db: PrismaClient = prisma) {
  try {
    const automations = await db.automation.findMany({
      where: { isActive: true },
    })

    for (const automation of automations) {
      try {
        const trigger = JSON.parse(automation.trigger)
        if (trigger.event !== triggerData.event) continue

        const actions = JSON.parse(automation.actions)
        let success = true
        let output = ""

        for (const action of actions) {
          try {
            const result = await executeAction(action, triggerData, db)
            output += `${action.type}: ${result}\n`
          } catch (err) {
            success = false
            output += `${action.type}: ERRO - ${err instanceof Error ? err.message : "Erro desconhecido"}\n`
          }
        }

        await db.automationLog.create({
          data: {
            automationId: automation.id,
            status: success ? "success" : "partial_failure",
            input: JSON.stringify(triggerData),
            output,
          },
        })
      } catch (err) {
        console.error(`Erro na automação ${automation.id}:`, err)
        await db.automationLog.create({
          data: {
            automationId: automation.id,
            status: "error",
            input: JSON.stringify(triggerData),
            error: err instanceof Error ? err.message : "Erro desconhecido",
          },
        })
      }
    }
  } catch (error) {
    console.error("Erro ao executar automações:", error)
  }
}

async function executeAction(
  action: { type: string; templateId?: string; message?: string; userId?: string; url?: string },
  triggerData: TriggerData,
  db: PrismaClient = prisma
): Promise<string> {
  switch (action.type) {
    case "send_template": {
      if (!action.templateId) return "Template ID não fornecido"
      const template = await db.messageTemplate.findUnique({
        where: { id: action.templateId },
      })
      if (!template) return "Template não encontrado"

      let content = template.content
      content = content.replace(/\{\{nome\}\}/gi, triggerData.leadName || "")
      content = content.replace(/\{\{email\}\}/gi, triggerData.leadEmail || "")
      content = content.replace(/\{\{telefone\}\}/gi, triggerData.leadPhone || "")

      if (triggerData.leadPhone) {
        const connection = await db.whatsappConnection.findFirst({ where: { isDefault: true } })
        if (connection) {
          const jid = formatToJid(triggerData.leadPhone)
          const result = await sendTextMessage(connection.id, jid, content)
          if (result.success) {
            return `Template "${template.name}" enviado para ${triggerData.leadPhone}`
          }
        }
        return `Template "${template.name}" preparado (WhatsApp não conectado)`
      }
      return `Template "${template.name}" preparado (lead sem telefone)`
    }

    case "notify_team": {
      const users = await db.user.findMany({
        where: { isActive: true, role: { in: ["admin", "super_admin"] } },
        select: { id: true },
      })

      for (const user of users) {
        await db.notification.create({
          data: {
            userId: user.id,
            type: "novo_lead",
            title: action.message || "Nova ação de automação",
            message: `Lead: ${triggerData.leadName || "Sem nome"} - Evento: ${triggerData.event}`,
          },
        })
      }
      return `${users.length} notificações enviadas`
    }

    case "assign_lead": {
      if (!action.userId || !triggerData.leadId) return "Dados insuficientes"
      await db.lead.update({
        where: { id: triggerData.leadId },
        data: { assignedToId: action.userId },
      })
      return `Lead atribuído ao usuário ${action.userId}`
    }

    case "webhook": {
      if (!action.url) return "URL não fornecida"
      const res = await fetch(action.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(triggerData),
      })
      return `Webhook enviado: ${res.status}`
    }

    case "n8n_webhook": {
      if (!N8N_URL) return "N8N não configurado (defina N8N_URL no .env)"
      const webhookPath = (action as { type: string; path?: string }).path || "/webhook/leadflow"
      const n8nEndpoint = `${N8N_URL.replace(/\/$/, "")}${webhookPath}`
      const n8nRes = await fetch(n8nEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(triggerData),
      })
      return `N8N webhook enviado (${n8nEndpoint}): ${n8nRes.status}`
    }

    case "change_status": {
      const newStatus = (action as { type: string; status?: string }).status
      if (!newStatus || !triggerData.leadId) return "Dados insuficientes"
      await db.lead.update({
        where: { id: triggerData.leadId },
        data: { status: newStatus },
      })
      return `Status alterado para ${newStatus}`
    }

    default:
      return `Ação desconhecida: ${action.type}`
  }
}
