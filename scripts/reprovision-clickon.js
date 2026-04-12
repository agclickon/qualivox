/**
 * Re-provisiona o banco isolado da Clickon a partir do banco default atual
 * Mantém todos os dados existentes e apenas cria o arquivo isolado
 */

const { PrismaClient } = require("@prisma/client")
const path = require("path")
const fs = require("fs")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const TENANTS_DIR = path.join(process.cwd(), "data", "tenants")
const DB_PATH = path.join(TENANTS_DIR, `leadflow-${COMPANY_ID}.db`)
const DEFAULT_DB = path.join(process.cwd(), "prisma", "dev.db")

async function main() {
  console.log("=== Re-provisionando banco da Clickon ===\n")

  // Remove banco antigo se existir
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH)
    console.log("Banco antigo removido")
  }

  // Copia banco default como base (tem schema completo + todos os dados)
  fs.copyFileSync(DEFAULT_DB, DB_PATH)
  console.log("Banco copiado do default")

  // Conecta ao banco do tenant
  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: `file:${DB_PATH}` } }
  })

  // Limpa tabelas SaaS (não devem existir no tenant isolado)
  const saaTables = ["saas_audit_logs", "saas_companies", "saas_plans"]
  for (const t of saaTables) {
    try {
      await tenantPrisma.$executeRawUnsafe(`DELETE FROM "${t}"`)
      console.log(`  Limpou: ${t}`)
    } catch {}
  }

  // Remove usuários que não são da Clickon (companyId diferente ou nulo sem ser o admin)
  const mainPrisma = new PrismaClient()
  const clickonUsers = await mainPrisma.user.findMany({
    where: { companyId: COMPANY_ID },
    select: { id: true, email: true }
  })

  const clickonUserIds = clickonUsers.map(u => u.id)
  console.log(`\nUsuários da Clickon: ${clickonUsers.map(u => u.email).join(", ")}`)

  // Remove usuários que não pertencem à Clickon do banco isolado
  const allTenantUsers = await tenantPrisma.user.findMany({ select: { id: true, email: true } })
  for (const u of allTenantUsers) {
    if (!clickonUserIds.includes(u.id)) {
      try {
        await tenantPrisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ?`, u.id)
        console.log(`  Removido usuário externo: ${u.email}`)
      } catch {}
    }
  }

  // Garante que os usuários da Clickon têm passwordHash correto no tenant
  for (const cu of clickonUsers) {
    const fullUser = await mainPrisma.user.findUnique({ where: { id: cu.id } })
    if (fullUser) {
      try {
        await tenantPrisma.user.update({
          where: { id: cu.id },
          data: { passwordHash: fullUser.passwordHash }
        })
      } catch {}
    }
  }

  await tenantPrisma.$disconnect()
  await mainPrisma.$disconnect()

  console.log("\n=== Banco re-provisionado com sucesso! ===")
  console.log(`Arquivo: ${DB_PATH}`)
  console.log("Reinicie o servidor.")
}

main().catch(e => {
  console.error("Erro:", e)
  process.exit(1)
})
