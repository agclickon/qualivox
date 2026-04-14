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

// Usa DIRECT_URL (porta 5432, sem PgBouncer) para evitar timeout
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
})

async function main() {
  console.log("🧹 Limpando dados mock do Supabase...\n")

  // Pré-busca IDs mock
  const mockUsers = await prisma.user.findMany({
    where: { email: { contains: "@leadflow.com" } },
    select: { id: true, email: true }
  })
  console.log(`  Users mock: ${mockUsers.map(u => u.email).join(", ")}`)

  const mockLeads = await prisma.lead.findMany({
    where: { id: { startsWith: "lead-" } },
    select: { id: true, name: true }
  })
  console.log(`  Leads mock: ${mockLeads.length} encontrados`)

  const mockConvs = await prisma.conversation.findMany({
    where: { leadId: { in: mockLeads.map(l => l.id) } },
    select: { id: true }
  })

  const mockUserIds = mockUsers.map(u => `'${u.id}'`).join(",")
  const mockLeadIds = mockLeads.map(l => `'${l.id}'`).join(",")
  const mockConvIds = mockConvs.map(c => `'${c.id}'`).join(",")

  // Tudo dentro de uma transaction para manter o SET timeout
  console.log("\n  Executando deletes...\n")
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = '300000'`)

    await tx.$executeRawUnsafe(`DELETE FROM event_reminders`)
    console.log("  ✅ Event reminders")

    await tx.$executeRawUnsafe(`DELETE FROM calendar_events`)
    console.log("  ✅ Calendar events")

    if (mockUserIds) {
      await tx.$executeRawUnsafe(`DELETE FROM calendar_integrations WHERE user_id IN (${mockUserIds})`)
      console.log("  ✅ Calendar integrations mock")
    }

    if (mockLeadIds) {
      await tx.$executeRawUnsafe(`DELETE FROM lgpd_consents WHERE lead_id IN (${mockLeadIds})`)
      console.log("  ✅ LGPD consents mock")
    }

    await tx.$executeRawUnsafe(`DELETE FROM automation_logs`)
    console.log("  ✅ Automation logs")

    await tx.$executeRawUnsafe(`DELETE FROM automations`)
    console.log("  ✅ Automations")

    if (mockUserIds) {
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE user_id IN (${mockUserIds})`)
      console.log("  ✅ Audit logs mock")
    }

    if (mockLeadIds) {
      await tx.$executeRawUnsafe(`DELETE FROM ai_analyses WHERE lead_id IN (${mockLeadIds})`)
      console.log("  ✅ AI analyses mock")

      await tx.$executeRawUnsafe(`DELETE FROM interactions WHERE lead_id IN (${mockLeadIds})`)
      console.log("  ✅ Interactions mock")

      await tx.$executeRawUnsafe(`DELETE FROM lead_tags WHERE lead_id IN (${mockLeadIds})`)
      console.log("  ✅ Lead tags mock")
    }

    if (mockConvIds) {
      await tx.$executeRawUnsafe(`DELETE FROM messages WHERE conversation_id IN (${mockConvIds})`)
      console.log("  ✅ Messages mock")

      await tx.$executeRawUnsafe(`DELETE FROM conversations WHERE id IN (${mockConvIds})`)
      console.log("  ✅ Conversations mock")
    }

    if (mockLeadIds) {
      await tx.$executeRawUnsafe(`DELETE FROM leads WHERE id LIKE 'lead-%'`)
      console.log("  ✅ Leads mock")
    }

    if (mockUserIds) {
      await tx.$executeRawUnsafe(`DELETE FROM refresh_tokens WHERE user_id IN (${mockUserIds})`)
      console.log("  ✅ Refresh tokens mock")
    }

    await tx.$executeRawUnsafe(`DELETE FROM saas_audit_logs`)
    console.log("  ✅ SaaS audit logs")

    await tx.$executeRawUnsafe(`DELETE FROM saas_companies`)
    console.log("  ✅ SaaS companies")

    await tx.$executeRawUnsafe(`DELETE FROM saas_plans`)
    console.log("  ✅ SaaS plans")

    if (mockUserIds) {
      await tx.$executeRawUnsafe(`DELETE FROM users WHERE id IN (${mockUserIds})`)
      console.log("  ✅ Users mock")
    }
  }, { timeout: 300000 })

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
