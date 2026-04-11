const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  const msgs = await p.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      conversation: {
        include: {
          lead: {
            select: { name: true, phone: true }
          }
        }
      }
    }
  })
  
  console.log('Latest messages in DB:')
  msgs.forEach((m, i) => {
    console.log(i + 1 + '. Lead:', m.conversation.lead.name || m.conversation.lead.phone)
    console.log('   Direction:', m.direction)
    console.log('   Content:', m.content.substring(0, 50))
    console.log('   Created:', m.createdAt)
    console.log('---')
  })
  
  await p.$disconnect()
}

check()
