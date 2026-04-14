/**
 * Remove dados mock do Supabase, mantendo apenas dados reais da Clickon.
 * 
 * Dados REAIS a manter:
 * - User: agclickon@gmail.com
 * - Leads criados via WhatsApp (sem prefixo "lead-")
 * - Agentes: IAsmin, Lucke
 * - WhatsApp connections
 * - Conversations e Messages reais
 * - Settings (chaves de API, configurações)
 * - Agent Knowledge
 * - Pipeline Stages (estrutura necessária)
 * 
 * Dados MOCK a remover:
 * - Users @leadflow.com
 * - Leads com id prefixo "lead-"
 * - Interactions mock (vinculados a leads mock)
 * - AI Analyses mock
 * - Automations e logs mock
 * - LGPD consents mock
 * - Calendar integrations/events mock
 * - Audit logs mock
 * - SaaS Plans e Companies (estrutura mock)
 */

import { PrismaClient } from "@prisma/client"

// Usa DIRECT_URL para evitar timeout do PgBouncer
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL }
  }
})

async function main() {
  console.log("🧹 Limpando dados mock do Supabase...\n")

  // Aumenta timeout para operações de limpeza
  await prisma.$executeRawUnsafe(`SET statement_timeout = '120s'`)

  // IDs dos users mock (email @leadflow.com)
  const mockUsers = await prisma.user.findMany({
    where: { email: { contains: "@leadflow.com" } },
    select: { id: true, email: true }
  })
  const mockUserIds = mockUsers.map(u => u.id)
  console.log(`  Users mock encontrados: ${mockUsers.length}`)
  mockUsers.forEach(u => console.log(`    - ${u.email}`))

  // IDs dos leads mock (id começa com "lead-")
  const mockLeads = await prisma.lead.findMany({
    where: { id: { startsWith: "lead-" } },
    select: { id: true, name: true }
  })
  const mockLeadIds = mockLeads.map(l => l.id)
  console.log(`\n  Leads mock encontrados: ${mockLeads.length}`)
  mockLeads.forEach(l => console.log(`    - ${l.name}`))

  // === DELETAR EM ORDEM DE DEPENDÊNCIAS (FK) ===

  // 1. Event reminders (dependem de calendar_events)
  const delReminders = await prisma.eventReminder.deleteMany({})
  console.log(`\n  ✅ Event reminders: ${delReminders.count} removidos`)

  // 2. Calendar events (dependem de calendar_integrations)
  const delCalEvents = await prisma.calendarEvent.deleteMany({})
  console.log(`  ✅ Calendar events: ${delCalEvents.count} removidos`)

  // 3. Calendar integrations (mock - vinculados a user mock)
  const delCalInt = await prisma.calendarIntegration.deleteMany({
    where: { userId: { in: mockUserIds } }
  })
  console.log(`  ✅ Calendar integrations mock: ${delCalInt.count} removidos`)

  // 4. LGPD consents (vinculados a leads mock)
  const delLgpd = await prisma.lgpdConsent.deleteMany({
    where: { leadId: { in: mockLeadIds } }
  })
  console.log(`  ✅ LGPD consents mock: ${delLgpd.count} removidos`)

  // 5. Automation logs
  const delAutoLogs = await prisma.automationLog.deleteMany({})
  console.log(`  ✅ Automation logs: ${delAutoLogs.count} removidos`)

  // 6. Automations
  const delAutos = await prisma.automation.deleteMany({})
  console.log(`  ✅ Automations: ${delAutos.count} removidos`)

  // 7. Audit logs mock (vinculados a users mock)
  const delAudit = await prisma.auditLog.deleteMany({
    where: { userId: { in: mockUserIds } }
  })
  console.log(`  ✅ Audit logs mock: ${delAudit.count} removidos`)

  // 8. AI Analyses vinculados a leads mock
  const delAi = await prisma.aiAnalysis.deleteMany({
    where: { leadId: { in: mockLeadIds } }
  })
  console.log(`  ✅ AI analyses mock: ${delAi.count} removidos`)

  // 9. Interactions vinculados a leads mock
  const delInteractions = await prisma.interaction.deleteMany({
    where: { leadId: { in: mockLeadIds } }
  })
  console.log(`  ✅ Interactions mock: ${delInteractions.count} removidos`)

  // 10. Lead tags (vinculados a leads mock)
  const delLeadTags = await prisma.leadTag.deleteMany({
    where: { leadId: { in: mockLeadIds } }
  })
  console.log(`  ✅ Lead tags mock: ${delLeadTags.count} removidos`)

  // 11. Messages de conversations vinculadas a leads mock
  // Primeiro, pega as conversations dos leads mock
  const mockConvs = await prisma.conversation.findMany({
    where: { leadId: { in: mockLeadIds } },
    select: { id: true }
  })
  const mockConvIds = mockConvs.map(c => c.id)

  if (mockConvIds.length > 0) {
    const delMsgs = await prisma.message.deleteMany({
      where: { conversationId: { in: mockConvIds } }
    })
    console.log(`  ✅ Messages de conversations mock: ${delMsgs.count} removidos`)

    const delConvs = await prisma.conversation.deleteMany({
      where: { id: { in: mockConvIds } }
    })
    console.log(`  ✅ Conversations mock: ${delConvs.count} removidos`)
  }

  // 12. Leads mock
  const delLeads = await prisma.lead.deleteMany({
    where: { id: { in: mockLeadIds } }
  })
  console.log(`  ✅ Leads mock: ${delLeads.count} removidos`)

  // 13. Refresh tokens de users mock
  const delTokens = await prisma.refreshToken.deleteMany({
    where: { userId: { in: mockUserIds } }
  })
  console.log(`  ✅ Refresh tokens mock: ${delTokens.count} removidos`)

  // 14. SaaS Audit Logs
  const delSaasAudit = await prisma.saasAuditLog.deleteMany({})
  console.log(`  ✅ SaaS audit logs: ${delSaasAudit.count} removidos`)

  // 15. SaaS Companies
  const delSaasComp = await prisma.saasCompany.deleteMany({})
  console.log(`  ✅ SaaS companies: ${delSaasComp.count} removidos`)

  // 16. SaaS Plans
  const delSaasPlans = await prisma.saasPlan.deleteMany({})
  console.log(`  ✅ SaaS plans: ${delSaasPlans.count} removidos`)

  // 17. Users mock
  const delUsers = await prisma.user.deleteMany({
    where: { id: { in: mockUserIds } }
  })
  console.log(`  ✅ Users mock: ${delUsers.count} removidos`)

  // === VERIFICAÇÃO FINAL ===
  console.log("\n" + "=".repeat(50))
  console.log("📊 DADOS RESTANTES (reais):")
  console.log("=".repeat(50))

  const finalUsers = await prisma.user.findMany({ select: { name: true, email: true, role: true } })
  console.log(`\n  Users: ${finalUsers.length}`)
  finalUsers.forEach(u => console.log(`    ${u.role.padEnd(12)} | ${u.name} | ${u.email}`))

  const finalLeads = await prisma.lead.count()
  console.log(`  Leads: ${finalLeads}`)

  const finalAgents = await prisma.agent.count()
  console.log(`  Agents: ${finalAgents}`)

  const finalConvs = await prisma.conversation.count()
  console.log(`  Conversations: ${finalConvs}`)

  const finalMsgs = await prisma.message.count()
  console.log(`  Messages: ${finalMsgs}`)

  const finalSettings = await prisma.setting.count()
  console.log(`  Settings: ${finalSettings}`)

  const finalPipeline = await prisma.pipelineStage.count()
  console.log(`  Pipeline stages: ${finalPipeline}`)

  const finalKnowledge = await prisma.agentKnowledge.count()
  console.log(`  Agent knowledge: ${finalKnowledge}`)

  const finalConnections = await prisma.whatsappConnection.count()
  console.log(`  WhatsApp connections: ${finalConnections}`)

  await prisma.$disconnect()
  console.log("\n✅ Limpeza concluída!")
}

main().catch(e => { console.error(e); process.exit(1) })
