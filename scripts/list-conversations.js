const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const conversations = await prisma.conversation.findMany({
    select: {
      id: true,
      whatsappChatId: true,
      lead: {
        select: {
          id: true,
          name: true,
          whatsappNumber: true,
        },
      },
      connectionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log(JSON.stringify(conversations, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
