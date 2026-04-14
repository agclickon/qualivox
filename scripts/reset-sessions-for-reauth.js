/**
 * Limpa as sessões antigas (com registered:false) para forçar novo QR code
 */
const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function run() {
  const result = await tenant.$executeRawUnsafe(
    "UPDATE whatsapp_connections SET session = '', status = 'DISCONNECTED', qrcode = '' WHERE status IN ('DISCONNECTED', 'OPENING', 'qrcode')"
  )
  console.log(`${result} conexões resetadas — sessões limpas para novo QR code`)

  const conns = await tenant.$queryRawUnsafe("SELECT id, name, status, LENGTH(session) as slen FROM whatsapp_connections")
  conns.forEach(c => console.log(`  ${c.name} | ${c.status} | session: ${c.slen || 0} bytes`))

  await tenant.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
