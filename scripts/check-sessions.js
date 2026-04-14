const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const p = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

async function main() {
  const conns = await p.whatsappConnection.findMany({
    select: { id: true, name: true, status: true, session: true, phoneNumber: true, profilePicUrl: true }
  })
  for (const c of conns) {
    console.log(`\n[${c.name}]`)
    console.log("  status:", c.status)
    console.log("  phoneNumber:", c.phoneNumber)
    try { console.log("  profilePicUrl:", c.profilePicUrl) } catch { console.log("  profilePicUrl: campo não existe") }
    console.log("  session length:", c.session?.length || 0)
    console.log("  session preview:", c.session?.substring(0, 80) || "VAZIO")
  }
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
