/**
 * Verifica se o tenant da Clickon está configurado corretamente
 */
const { PrismaClient } = require("@prisma/client")
const path = require("path")
const fs = require("fs")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const mainPrisma = new PrismaClient()

async function main() {
  console.log("=== Debug Tenant Clickon ===\n")

  // 1. Verifica usuário no banco central
  const user = await mainPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" },
    select: { id: true, email: true, companyId: true, role: true }
  })
  console.log("1. Usuário no banco central:")
  console.log("  ", JSON.stringify(user))

  // 2. Verifica empresa no banco central
  const company = await mainPrisma.saasCompany.findUnique({
    where: { id: COMPANY_ID },
    select: { id: true, name: true, slug: true }
  })
  console.log("\n2. Empresa no banco central:")
  console.log("  ", JSON.stringify(company))

  // 3. Verifica se banco isolado existe
  console.log("\n3. Banco isolado:")
  console.log("  Caminho:", DB_PATH)
  console.log("  Existe:", fs.existsSync(DB_PATH))
  if (fs.existsSync(DB_PATH)) {
    const stat = fs.statSync(DB_PATH)
    console.log("  Tamanho:", (stat.size / 1024 / 1024).toFixed(2), "MB")
  }

  // 4. Verifica dados no banco isolado
  if (fs.existsSync(DB_PATH)) {
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: `file:${DB_PATH}` } }
    })
    
    const users = await tenantPrisma.user.findMany({ select: { email: true, role: true } })
    const leads = await tenantPrisma.lead.count()
    const convs = await tenantPrisma.conversation.count()
    
    console.log("\n4. Dados no banco isolado:")
    console.log("  Usuários:", JSON.stringify(users))
    console.log("  Leads:", leads)
    console.log("  Conversas:", convs)
    
    await tenantPrisma.$disconnect()
  }

  // 5. Verifica tenant resolution — simula o que resolveTenant faz
  // resolveTenant busca por userId no banco central → retorna companyId + isDefault
  if (user) {
    const isDefault = !user.companyId || user.companyId === "default"
    console.log("\n5. Simulação de resolveTenant:")
    console.log("  userId:", user.id)
    console.log("  companyId:", user.companyId)
    console.log("  isDefault:", isDefault)
    console.log("  Deve usar banco isolado:", !isDefault)
  }

  await mainPrisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
