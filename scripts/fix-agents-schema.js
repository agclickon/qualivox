const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const dbs = [
  { label: "banco isolado Clickon", client: new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } }) },
  { label: "banco default", client: new PrismaClient() },
]

const migrations = [
  "ALTER TABLE agents ADD COLUMN supervisor_phone TEXT",
]

async function run() {
  for (const { label, client } of dbs) {
    for (const sql of migrations) {
      try {
        await client.$executeRawUnsafe(sql)
        console.log(`✓ ${label}: ${sql}`)
      } catch (e) {
        console.log(`- ${label}: ${e.message.includes("duplicate") ? "já existe" : e.message}`)
      }
    }
    await client.$disconnect()
  }
  console.log("Pronto!")
}
run().catch(e => { console.error(e); process.exit(1) })
