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

async function exec(label: string, sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql)
    console.log(`  ✅ ${label}`)
  } catch (e: any) {
    console.log(`  ⚠️ ${label}: ${e.message?.substring(0, 80)}`)
  }
}

async function main() {
  console.log("🧹 Limpando dados mock do Supabase...\n")
  console.log(`  DB: ${directUrl?.substring(0, 40)}...`)

  // Aumenta timeout na sessão
  await prisma.$executeRawUnsafe(`SET statement_timeout = '300000'`)
  
  // IDs dos users mock (email @leadflow.com)
  const mockUsers = await prisma.user.findMany({
    where: { email: { contains: "@leadflow.com" } },
    select: { id: true, email: true }
  })
  console.log(`  Users mock: ${mockUsers.map(u => u.email).join(", ")}`)

  const mockLeads = await prisma.lead.findMany({
    where: { id: { startsWith: "lead-" } },
    select: { id: true, name: true }
  })
  console.log(`  Leads mock: ${mockLeads.length} encontrados\n`)

  const mockUserIds = mockUsers.map(u => `'${u.id}'`).join(",")
  const mockLeadIds = mockLeads.map(l => `'${l.id}'`).join(",")

  // === DELETAR EM ORDEM DE DEPENDÊNCIAS (FK) ===

  await exec("Event reminders", `DELETE FROM event_reminders`)
  await exec("Calendar events", `DELETE FROM calendar_events`)
  await exec("Calendar integrations (mock users)", `DELETE FROM calendar_integrations WHERE user_id IN (${mockUserIds})`)
  await exec("LGPD consents (mock leads)", `DELETE FROM lgpd_consents WHERE lead_id IN (${mockLeadIds})`)
  await exec("Automation logs", `DELETE FROM automation_logs`)
  await exec("Automations", `DELETE FROM automations`)
  await exec("Audit logs (mock users)", `DELETE FROM audit_logs WHERE user_id IN (${mockUserIds})`)
  await exec("AI analyses (mock leads)", `DELETE FROM ai_analyses WHERE lead_id IN (${mockLeadIds})`)
  await exec("Interactions (mock leads)", `DELETE FROM interactions WHERE lead_id IN (${mockLeadIds})`)
  await exec("Lead tags (mock leads)", `DELETE FROM lead_tags WHERE lead_id IN (${mockLeadIds})`)

  // Conversations dos leads mock
  const mockConvs = await prisma.conversation.findMany({
    where: { leadId: { in: mockLeads.map(l => l.id) } },
    select: { id: true }
  })
  if (mockConvs.length > 0) {
    const mockConvIds = mockConvs.map(c => `'${c.id}'`).join(",")
    await exec("Messages (mock convs)", `DELETE FROM messages WHERE conversation_id IN (${mockConvIds})`)
    await exec("Conversations (mock)", `DELETE FROM conversations WHERE id IN (${mockConvIds})`)
  }

  await exec("Leads mock", `DELETE FROM leads WHERE id LIKE 'lead-%'`)
  await exec("Refresh tokens (mock users)", `DELETE FROM refresh_tokens WHERE user_id IN (${mockUserIds})`)
  await exec("SaaS audit logs", `DELETE FROM saas_audit_logs`)
  await exec("SaaS companies", `DELETE FROM saas_companies`)
  await exec("SaaS plans", `DELETE FROM saas_plans`)
  await exec("Users mock", `DELETE FROM users WHERE id IN (${mockUserIds})`)

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
