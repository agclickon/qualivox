/**
 * Sincroniza o passwordHash do usuário da Clickon do banco central para o banco isolado
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
  // Busca usuário no banco central
  const central = await mainPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" },
    select: { id: true, email: true, name: true, passwordHash: true, role: true, isActive: true }
  })

  console.log("Banco central:")
  console.log("  email:", central?.email)
  console.log("  passwordHash:", central?.passwordHash?.substring(0, 20) + "...")

  // Busca no banco isolado
  const tenant = await tenantPrisma.user.findUnique({
    where: { email: "agclickon@gmail.com" },
    select: { id: true, passwordHash: true }
  })

  console.log("\nBanco isolado:")
  console.log("  passwordHash:", tenant?.passwordHash?.substring(0, 20) + "...")

  if (!tenant) {
    console.log("\nUsuário não existe no banco isolado — criando...")
    await tenantPrisma.user.create({
      data: {
        id: central.id,
        email: central.email,
        name: central.name,
        passwordHash: central.passwordHash,
        role: central.role,
        isActive: central.isActive
      }
    })
    console.log("✓ Usuário criado")
  } else if (tenant.passwordHash !== central.passwordHash) {
    console.log("\nPasswordHash diferente — sincronizando...")
    await tenantPrisma.user.update({
      where: { email: "agclickon@gmail.com" },
      data: { passwordHash: central.passwordHash }
    })
    console.log("✓ Sincronizado")
  } else {
    console.log("\nPasswordHash já está sincronizado")
  }

  await mainPrisma.$disconnect()
  await tenantPrisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
