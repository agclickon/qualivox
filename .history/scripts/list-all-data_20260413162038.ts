import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== USERS ===")
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, companyId: true } })
  users.forEach((u: any) => console.log(`  ${u.id.substring(0,8)}... | ${u.name?.padEnd(20)} | ${u.email?.padEnd(25)} | ${u.role?.padEnd(12)} | company: ${u.companyId || 'null'}`))

  console.log("\n=== LEADS (todos) ===")
  const leads = await prisma.lead.findMany({ select: { id: true, name: true, phone: true, email: true, source: true, status: true, createdAt: true } })
  leads.forEach((l: any) => console.log(`  ${l.id.substring(0,8)}... | ${l.name?.padEnd(25)} | ${(l.phone||'N/A').padEnd(15)} | ${(l.email||'N/A').padEnd(25)} | ${(l.source||'').padEnd(10)} | ${l.status}`))

  console.log("\n=== SAAS PLANS ===")
  const plans = await prisma.saaSPlan.findMany()
  plans.forEach((p: any) => console.log(`  ${p.id.substring(0,8)}... | ${p.name?.padEnd(15)} | ${p.price}`))

  console.log("\n=== SAAS COMPANIES ===")
  const companies = await prisma.saaSCompany.findMany()
  companies.forEach((c: any) => console.log(`  ${c.id.substring(0,8)}... | ${c.name?.padEnd(20)} | plan: ${c.planId?.substring(0,8) || 'null'}`))

  console.log("\n=== INTERACTIONS (count) ===")
  const intCount = await prisma.interaction.count()
  console.log(`  Total: ${intCount}`)

  console.log("\n=== AI_ANALYSES (count) ===")
  const aiCount = await prisma.aiAnalysis.count()
  console.log(`  Total: ${aiCount}`)

  console.log("\n=== AUDIT_LOGS (count) ===")
  const auditCount = await prisma.auditLog.count()
  console.log(`  Total: ${auditCount}`)

  console.log("\n=== AUTOMATIONS ===")
  const autos = await prisma.automation.findMany({ select: { id: true, name: true, isActive: true } })
  autos.forEach((a: any) => console.log(`  ${a.id.substring(0,8)}... | ${a.name?.padEnd(30)} | active: ${a.isActive}`))

  console.log("\n=== AUTOMATION_LOGS (count) ===")
  const autoLogCount = await prisma.automationLog.count()
  console.log(`  Total: ${autoLogCount}`)

  console.log("\n=== LGPD_CONSENTS (count) ===")
  const lgpdCount = await prisma.lgpdConsent.count()
  console.log(`  Total: ${lgpdCount}`)

  console.log("\n=== CALENDAR_INTEGRATIONS ===")
  const calInt = await prisma.calendarIntegration.findMany({ select: { id: true, userId: true, provider: true, isActive: true } })
  calInt.forEach((c: any) => console.log(`  ${c.id.substring(0,8)}... | user: ${c.userId.substring(0,8)} | ${c.provider} | active: ${c.isActive}`))

  console.log("\n=== CALENDAR_EVENTS (count) ===")
  const calEvCount = await prisma.calendarEvent.count()
  console.log(`  Total: ${calEvCount}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
