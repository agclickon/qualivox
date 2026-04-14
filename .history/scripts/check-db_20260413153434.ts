import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔍 Verificando dados no Supabase...\n")

  // Users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, companyName: true }
  })
  console.log(`=== USERS (${users.length}) ===`)
  users.forEach(u => console.log(`  ${u.role.padEnd(12)} | ${u.name.padEnd(20)} | ${u.email} | active: ${u.isActive}`))

  // Leads
  const leads = await prisma.lead.count()
  console.log(`\n=== LEADS: ${leads} ===`)

  // Agents
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, isActive: true, mode: true, provider: true, model: true }
  })
  console.log(`\n=== AGENTS (${agents.length}) ===`)
  agents.forEach(a => console.log(`  ${a.name.padEnd(30)} | mode: ${a.mode} | ${a.provider || 'default'}/${a.model || 'default'} | active: ${a.isActive}`))

  // WhatsApp Connections
  const connections = await prisma.whatsappConnection.findMany({
    select: { id: true, name: true, status: true, instanceName: true, phoneNumber: true }
  })
  console.log(`\n=== WHATSAPP CONNECTIONS (${connections.length}) ===`)
  connections.forEach(c => console.log(`  ${(c.name || '').padEnd(20)} | ${c.instanceName || 'N/A'} | ${c.phoneNumber || 'N/A'} | status: ${c.status}`))

  // Pipeline Stages
  const stages = await prisma.pipelineStage.count()
  console.log(`\n=== PIPELINE STAGES: ${stages} ===`)

  // Conversations
  const convs = await prisma.conversation.count()
  console.log(`=== CONVERSATIONS: ${convs} ===`)

  // Messages
  const msgs = await prisma.message.count()
  console.log(`=== MESSAGES: ${msgs} ===`)

  // Settings
  const settings = await prisma.setting.findMany()
  console.log(`\n=== SETTINGS (${settings.length}) ===`)
  settings.forEach(s => console.log(`  ${s.key.padEnd(25)} | ${s.value || '(vazio)'}`))

  // Knowledge files
  const knowledge = await prisma.agentKnowledge.findMany({
    select: { id: true, fileName: true, status: true, chunkCount: true, agentId: true }
  })
  console.log(`\n=== AGENT KNOWLEDGE FILES (${knowledge.length}) ===`)
  knowledge.forEach(k => console.log(`  ${k.fileName.padEnd(30)} | chunks: ${k.chunkCount} | status: ${k.status}`))

  await prisma.$disconnect()
  console.log("\n✅ Verificação concluída!")
}

main().catch(e => { console.error(e); process.exit(1) })
