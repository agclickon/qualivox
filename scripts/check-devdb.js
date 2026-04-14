const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
async function main() {
  const leads = await p.lead.count()
  const convs = await p.conversation.count()
  const users = await p.user.findMany({ select: { email: true, companyId: true } })
  console.log("Leads no dev.db:", leads)
  console.log("Conversas no dev.db:", convs)
  console.log("Usuários:", JSON.stringify(users, null, 2))
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
