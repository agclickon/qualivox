const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })
const mainDb = new PrismaClient()

async function run() {
  console.log("Resetando status OPENING → DISCONNECTED no banco isolado...")
  const r1 = await tenant.$executeRawUnsafe(
    "UPDATE whatsapp_connections SET status = 'DISCONNECTED' WHERE status = 'OPENING'"
  )
  console.log(`  ${r1} conexões resetadas no banco isolado`)

  console.log("Resetando status OPENING → DISCONNECTED no banco default...")
  const r2 = await mainDb.$executeRawUnsafe(
    "UPDATE whatsapp_connections SET status = 'DISCONNECTED' WHERE status = 'OPENING'"
  )
  console.log(`  ${r2} conexões resetadas no banco default`)

  await tenant.$disconnect()
  await mainDb.$disconnect()
  console.log("Pronto!")
}
run().catch(e => { console.error(e); process.exit(1) })
