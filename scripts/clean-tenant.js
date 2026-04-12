/**
 * Script para re-limpar bancos de tenant existentes
 * Uso: node scripts/clean-tenant.js
 */

const { PrismaClient } = require("@prisma/client")
const path = require("path")
const fs = require("fs")

const mainPrisma = new PrismaClient()

const TENANTS_DIR = path.join(process.cwd(), "data", "tenants")

const tablesToClean = [
  "agent_knowledge_chunks", "agent_knowledge", "agents",
  "webhook_deliveries", "webhooks", "automation_logs", "automations",
  "event_reminders", "calendar_events", "calendar_integrations",
  "follow_ups", "ai_analyses", "conversation_transfers", "lead_tags",
  "notifications", "audit_logs", "chat_messages", "messages",
  "interactions", "conversations", "whatsapp_connections", "whatsapp_integrations",
  "refresh_tokens", "lgpd_consents", "tags", "pipeline_stages", "leads",
  "message_templates", "users", "settings",
  "saas_audit_logs", "saas_companies", "saas_plans"
]

async function cleanTenant(companyId, adminEmail, adminName, adminUserId) {
  const dbPath = path.join(TENANTS_DIR, `leadflow-${companyId}.db`)

  if (!fs.existsSync(dbPath)) {
    console.log(`Banco não encontrado: ${dbPath}`)
    return
  }

  console.log(`\nLimpando tenant: ${companyId} (${dbPath})`)

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  })

  // Limpa todas as tabelas
  for (const table of tablesToClean) {
    try {
      const count = await tenantPrisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
      if (count > 0) console.log(`  Limpou ${table}: ${count} registros`)
    } catch (e) {
      // Tabela pode não existir
    }
  }

  // Recria usuário admin com senha correta do banco central
  const centralUser = await mainPrisma.user.findFirst({
    where: { companyId, role: "admin" }
  })

  if (centralUser) {
    await tenantPrisma.user.create({
      data: {
        id: centralUser.id,
        email: centralUser.email,
        name: centralUser.name,
        role: "admin",
        passwordHash: centralUser.passwordHash,
        isActive: true
      }
    })
    console.log(`  Admin recriado: ${centralUser.email}`)
  }

  // Seed settings
  try {
    const company = await mainPrisma.saasCompany.findUnique({ where: { id: companyId } })
    await tenantPrisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('company_name', ?, datetime('now'))`,
      company?.name || companyId
    )
    await tenantPrisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('tenant_id', ?, datetime('now'))`,
      companyId
    )
  } catch (e) {
    console.log("  Aviso ao criar settings:", e.message)
  }

  await tenantPrisma.$disconnect()
  console.log(`  Tenant limpo com sucesso!`)
}

async function main() {
  const companies = await mainPrisma.saasCompany.findMany({
    select: { id: true, name: true, email: true }
  })

  console.log("Empresas encontradas:", companies.map(c => `${c.name} (${c.id})`).join(", "))

  for (const company of companies) {
    const dbPath = path.join(TENANTS_DIR, `leadflow-${company.id}.db`)
    if (fs.existsSync(dbPath)) {
      await cleanTenant(company.id)
    } else {
      console.log(`\nSem banco isolado para: ${company.name} (usa banco default)`)
    }
  }

  await mainPrisma.$disconnect()
  console.log("\nConcluído!")
}

main().catch(e => {
  console.error("Erro:", e)
  process.exit(1)
})
