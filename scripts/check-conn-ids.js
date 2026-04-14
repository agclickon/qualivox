const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })
const mainDb = new PrismaClient()

async function run() {
  console.log("=== Banco isolado (Clickon) — IDs das conexões ===")
  const tConns = await tenant.$queryRawUnsafe("SELECT id, name, status FROM whatsapp_connections")
  tConns.forEach(c => console.log(`  ${c.id} | ${c.name} | ${c.status}`))

  console.log("\n=== Banco default — IDs das conexões ===")
  const dConns = await mainDb.$queryRawUnsafe("SELECT id, name, status FROM whatsapp_connections")
  dConns.forEach(c => console.log(`  ${c.id} | ${c.name} | ${c.status}`))

  await tenant.$disconnect()
  await mainDb.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
