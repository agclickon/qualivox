const { PrismaClient } = require("@prisma/client")
const path = require("path")
const { BufferJSON } = require("@whiskeysockets/baileys")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const tenant = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function run() {
  const conns = await tenant.$queryRawUnsafe("SELECT id, name, status, LENGTH(session) as slen, session FROM whatsapp_connections")

  for (const c of conns) {
    console.log(`\n=== ${c.name} (${c.status}) — session: ${c.slen || 0} bytes ===`)
    if (c.session && c.session.length > 2) {
      try {
        const parsed = JSON.parse(c.session, BufferJSON.reviver)
        console.log("  creds.me:", parsed.creds?.me?.id || "null")
        console.log("  creds.registered:", parsed.creds?.registered)
        console.log("  keys count:", Object.keys(parsed.keys || {}).length)
      } catch (e) {
        console.log("  ERRO ao parsear session:", e.message)
      }
    } else {
      console.log("  Session vazia ou ausente")
    }
  }

  await tenant.$disconnect()
}
run().catch(e => { console.error(e); process.exit(1) })
