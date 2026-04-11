const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const connections = await prisma.whatsappConnection.findMany({
    include: {
      conversations: { select: { id: true, whatsappChatId: true, lastMessageAt: true } },
      messages: { select: { id: true, createdAt: true } },
    },
  })

  console.log("Connections:")
  for (const conn of connections) {
    console.log({
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      status: conn.status,
      instanceName: conn.instanceName,
      apiUrl: conn.apiUrl,
      conversations: conn.conversations.length,
      messages: conn.messages.length,
    })
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
