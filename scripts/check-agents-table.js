const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function run() {
  // Verifica se tabela agents existe
  const tables = await tenant.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
  console.log("Tabela agents no banco isolado:", tables.length > 0 ? "EXISTE" : "NÃO EXISTE")

  if (tables.length > 0) {
    const agents = await tenant.$queryRawUnsafe("SELECT id, name, is_active FROM agents")
    console.log("Agentes:", agents)

    // Verifica colunas
    const cols = await tenant.$queryRawUnsafe("PRAGMA table_info(agents)")
    const colNames = cols.map(c => c.name)
    console.log("Colunas:", colNames.join(", "))

    const missing = ["supervisor_phone", "calendar_enabled", "calendar_add_meet_link"]
    missing.forEach(col => {
      console.log(`  ${col}: ${colNames.includes(col) ? "OK" : "FALTANDO"}`)
    })
  }

  await tenant.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
