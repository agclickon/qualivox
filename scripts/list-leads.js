const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, whatsappNumber: true, phone: true },
  })
  console.table(leads)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
