/**
 * Limpa dados de negócio do banco default
 * Mantém apenas: usuários da empresa padrão, settings, tabelas SaaS
 */

const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

const tablesToClean = [
  "agent_knowledge_chunks",
  "agent_knowledge",
  "agents",
  "webhook_deliveries",
  "webhooks",
  "automation_logs",
  "automations",
  "event_reminders",
  "calendar_events",
  "calendar_integrations",
  "follow_ups",
  "ai_analyses",
  "conversation_transfers",
  "lead_tags",
  "notifications",
  "audit_logs",
  "chat_messages",
  "messages",
  "interactions",
  "conversations",
  "whatsapp_connections",
  "whatsapp_integrations",
  "refresh_tokens",
  "lgpd_consents",
  "tags",
  "pipeline_stages",
  "leads",
  "message_templates",
]

async function main() {
  console.log("=== Limpando banco default ===\n")

  for (const table of tablesToClean) {
    try {
      const result = await p.$executeRawUnsafe(`DELETE FROM "${table}"`)
      if (result > 0) console.log(`  Limpou ${table}: ${result} registros`)
    } catch (e) {
      // tabela pode não existir
    }
  }

  // Remove usuários que pertencem a tenants isolados (companyId != null e != 'default')
  const removed = await p.$executeRaw`
    DELETE FROM users 
    WHERE company_id IS NOT NULL 
    AND company_id != 'default'
  `
  if (removed > 0) console.log(`  Removidos ${removed} usuários de tenants isolados`)

  // Confirma o que ficou
  const users = await p.user.findMany({ select: { email: true, role: true, companyId: true } })
  console.log("\nUsuários restantes no banco default:")
  users.forEach(u => console.log(`  ${u.email} | ${u.role} | companyId: ${u.companyId}`))

  await p.$disconnect()
  console.log("\n=== Banco default limpo! ===")
}

main().catch(e => { console.error(e); process.exit(1) })
