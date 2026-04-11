const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const id = process.argv[2]
  const phone = process.argv[3]

  if (!id || !phone) {
    console.error('Uso: node scripts/update-lead-number.js <leadId> <phone>')
    process.exit(1)
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      phone,
      whatsappNumber: phone,
    },
  })

  console.log('Lead atualizado:', lead.id, lead.name, lead.whatsappNumber)
}

main()
  .catch((err) => {
    console.error('Erro ao atualizar lead:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
