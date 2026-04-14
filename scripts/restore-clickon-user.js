/**
 * Restaura o usuário da Clickon no banco central a partir do banco isolado
 */
const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const mainPrisma = new PrismaClient()
const tenantPrisma = new PrismaClient({
  datasources: { db: { url: `file:${DB_PATH}` } }
})

async function main() {
  // Busca usuário no banco isolado (fonte de verdade)
  const tenantUser = await tenantPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" }
  })

  console.log("Usuário no banco isolado:", tenantUser?.email, "| hash:", tenantUser?.passwordHash?.substring(0, 20) + "...")

  if (!tenantUser) {
    console.error("Usuário não encontrado no banco isolado!")
    process.exit(1)
  }

  // Verifica se já existe no banco central
  const existing = await mainPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" }
  })

  if (existing) {
    // Atualiza passwordHash e companyId
    await mainPrisma.user.update({
      where: { email: "agclickon@gmail.com" },
      data: {
        passwordHash: tenantUser.passwordHash,
        companyId: COMPANY_ID,
        isActive: true
      }
    })
    console.log("✓ Usuário atualizado no banco central")
  } else {
    // Recria no banco central
    await mainPrisma.user.create({
      data: {
        id: tenantUser.id,
        email: tenantUser.email,
        name: tenantUser.name,
        passwordHash: tenantUser.passwordHash,
        role: tenantUser.role || "admin",
        isActive: true,
        companyId: COMPANY_ID
      }
    })
    console.log("✓ Usuário recriado no banco central")
  }

  // Confirma
  const check = await mainPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" },
    select: { email: true, companyId: true, role: true }
  })
  console.log("\nVerificação final:", check)

  await mainPrisma.$disconnect()
  await tenantPrisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
