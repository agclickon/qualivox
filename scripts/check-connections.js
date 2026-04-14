const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenantPrisma = new PrismaClient({
  datasources: { db: { url: `file:${DB_PATH}` } }
})

async function main() {
  const conns = await tenantPrisma.whatsappConnection.findMany({
    select: { id: true, name: true, profilePicUrl: true, profileName: true, status: true }
  })
  console.log("Conexões no banco isolado:")
  conns.forEach(c => console.log(`  ${c.name} | status: ${c.status} | profilePicUrl: ${c.profilePicUrl || "NULL"}`))
  await tenantPrisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
