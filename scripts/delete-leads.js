const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const ids = process.argv.slice(2)
  if (ids.length === 0) {
    console.error('Uso: node scripts/delete-leads.js <id1> <id2> ...')
    process.exit(1)
  }

  for (const id of ids) {
    console.log(`Removendo lead ${id}...`)
    await prisma.lead.delete({ where: { id } })
    console.log(`✓ Lead ${id} removido`)
  }
}

main()
  .catch((err) => {
    console.error('Erro:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
