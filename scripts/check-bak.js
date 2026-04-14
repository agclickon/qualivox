const { PrismaClient } = require("@prisma/client")
const path = require("path")

const BAK = path.join(process.cwd(), "data", "tenants", "leadflow-2f1a8058-25e8-48cc-9dcd-a20ac3b69456.db.bak")
const p = new PrismaClient({ datasources: { db: { url: `file:${BAK}` } } })

async function main() {
  const leads = await p.lead.count()
  const convs = await p.conversation.count()
  const users = await p.user.findMany({ select: { email: true } })
  console.log("Leads:", leads)
  console.log("Conversas:", convs)
  console.log("Usuários:", users.map(u => u.email))
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
