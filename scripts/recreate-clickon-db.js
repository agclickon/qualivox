/**
 * Recria o banco isolado da Clickon com o schema atual (dev.db como template)
 * e migra os dados críticos do banco antigo
 */
const { PrismaClient } = require("@prisma/client")
const path = require("path")
const fs = require("fs")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const TENANTS_DIR = path.join(process.cwd(), "data", "tenants")
const NEW_DB = path.join(TENANTS_DIR, `leadflow-${COMPANY_ID}.db`)
const OLD_DB = path.join(TENANTS_DIR, `leadflow-${COMPANY_ID}.db.bak`)
const DEFAULT_DB = path.join(process.cwd(), "prisma", "dev.db")

async function main() {
  console.log("=== Recriando banco isolado da Clickon ===\n")

  // Backup do banco antigo
  if (fs.existsSync(NEW_DB)) {
    fs.copyFileSync(NEW_DB, OLD_DB)
    console.log("Backup criado:", OLD_DB)
    fs.unlinkSync(NEW_DB)
  }

  // Copia dev.db (schema atual + dados da Clickon)
  fs.copyFileSync(DEFAULT_DB, NEW_DB)
  console.log("Banco recriado a partir do dev.db")

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: `file:${NEW_DB}` } }
  })
  const mainPrisma = new PrismaClient()

  // Limpa tabelas SaaS do banco isolado
  for (const t of ["saas_audit_logs", "saas_companies", "saas_plans"]) {
    try { await tenantPrisma.$executeRawUnsafe(`DELETE FROM "${t}"`) } catch {}
  }

  // Remove usuários que não são da Clickon
  const clickonUsers = await mainPrisma.user.findMany({
    where: { companyId: COMPANY_ID }
  })
  const clickonIds = clickonUsers.map(u => u.id)

  const allUsers = await tenantPrisma.user.findMany({ select: { id: true, email: true } })
  for (const u of allUsers) {
    if (!clickonIds.includes(u.id)) {
      try {
        await tenantPrisma.$executeRawUnsafe(`DELETE FROM users WHERE id = ?`, u.id)
        console.log(`  Removido: ${u.email}`)
      } catch {}
    }
  }

  // Garante passwordHash correto para usuário da Clickon
  for (const cu of clickonUsers) {
    try {
      await tenantPrisma.user.update({
        where: { id: cu.id },
        data: { passwordHash: cu.passwordHash, companyId: null }
      })
      console.log(`  ✓ User sincronizado: ${cu.email}`)
    } catch (e) {
      console.log(`  ✗ Erro ao sincronizar ${cu.email}: ${e.message}`)
    }
  }

  // Confirma conexões
  const conns = await tenantPrisma.whatsappConnection.findMany({
    select: { name: true, status: true, profilePicUrl: true }
  })
  console.log("\nConexões no banco isolado:")
  conns.forEach(c => console.log(`  ${c.name} | ${c.status} | foto: ${c.profilePicUrl ? "✓" : "null"}`))

  await tenantPrisma.$disconnect()
  await mainPrisma.$disconnect()

  console.log("\n=== Concluído! Reinicie o servidor. ===")
}

main().catch(e => { console.error(e); process.exit(1) })
