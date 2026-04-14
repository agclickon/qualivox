const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })
const main = new PrismaClient()

async function main() {
  console.log("=== Banco isolado (Clickon) ===")
  const tConns = await tenant.$queryRawUnsafe("SELECT name, status, LENGTH(session) as slen, profile_pic_url FROM whatsapp_connections")
  tConns.forEach(c => console.log(`  ${c.name} | ${c.status} | session: ${c.slen||0} bytes | pic: ${c.profile_pic_url ? "✓" : "null"}`))

  console.log("\n=== Banco default ===")
  const dConns = await main.$queryRawUnsafe("SELECT name, status, LENGTH(session) as slen FROM whatsapp_connections")
  dConns.forEach(c => console.log(`  ${c.name} | ${c.status} | session: ${c.slen||0} bytes`))

  await tenant.$disconnect()
  await main.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
