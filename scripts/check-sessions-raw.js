const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const p = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function main() {
  const cols = await p.$queryRawUnsafe("PRAGMA table_info(whatsapp_connections)")
  console.log("Colunas em whatsapp_connections:")
  cols.forEach(c => console.log(`  ${c.name} (${c.type})`))

  const rows = await p.$queryRawUnsafe("SELECT id, name, status FROM whatsapp_connections")
  console.log("\nConexões:")
  rows.forEach(r => console.log(`  ${r.name} | ${r.status}`))
  
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
