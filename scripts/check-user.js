const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, name: true, role: true, companyId: true }
  })
  console.log("Usuários no banco central:")
  users.forEach(u => console.log(`  ${u.email} | role: ${u.role} | companyId: ${u.companyId}`))
  
  const companies = await p.saasCompany.findMany({
    select: { id: true, name: true, email: true, status: true }
  })
  console.log("\nEmpresas:")
  companies.forEach(c => console.log(`  [${c.id}] ${c.name} | ${c.email} | ${c.status}`))
  
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
