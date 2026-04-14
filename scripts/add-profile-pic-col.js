const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const TENANT_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const defaultDb = new PrismaClient()
const tenantDb = new PrismaClient({ datasources: { db: { url: `file:${TENANT_PATH}` } } })

async function addCol(db, label) {
  try {
    await db.$executeRawUnsafe("ALTER TABLE whatsapp_connections ADD COLUMN profile_pic_url TEXT")
    console.log(`✓ ${label}: coluna adicionada`)
  } catch (e) {
    console.log(`- ${label}: ${e.message.includes("duplicate") ? "já existe" : e.message}`)
  }
}

async function run() {
  await addCol(defaultDb, "banco default")
  await addCol(tenantDb, "banco Clickon")
  await defaultDb.$disconnect()
  await tenantDb.$disconnect()
  console.log("Pronto!")
}
run().catch(e => { console.error(e); process.exit(1) })
