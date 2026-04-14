const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)
const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function run() {
  const agents = await tenant.$queryRawUnsafe("SELECT id, name, connection_ids, is_active, mode FROM agents")
  console.log("=== Agentes e connectionIds ===")
  for (const a of agents) {
    console.log(`\n${a.name} (${a.mode}) isActive=${a.is_active}`)
    console.log("  connection_ids raw:", a.connection_ids)
    try {
      const ids = JSON.parse(a.connection_ids || "[]")
      console.log("  connection_ids parsed:", ids)
    } catch(e) {
      console.log("  ERRO parse:", e.message)
    }
  }

  console.log("\n=== Conexões WhatsApp ===")
  const conns = await tenant.$queryRawUnsafe("SELECT id, name, status FROM whatsapp_connections")
  conns.forEach(c => console.log(`  ${c.id} | ${c.name} | ${c.status}`))

  await tenant.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
