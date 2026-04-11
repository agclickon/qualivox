const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const leadName = process.argv[2] || 'Luciano Pereira'
  const lead = await prisma.lead.findFirst({
    where: { name: leadName },
    select: { id: true, name: true },
  })

  if (!lead) {
    console.log('Lead not found')
    return
  }

  const conversations = await prisma.conversation.findMany({
    where: { leadId: lead.id },
    select: {
      id: true,
      whatsappChatId: true,
      connectionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log('Lead:', lead)
  console.log('Conversations:', conversations)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
