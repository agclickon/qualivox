/**
 * Adiciona colunas faltantes ao banco isolado da Clickon
 * para alinhar com o schema atual do Prisma
 */
const { PrismaClient } = require("@prisma/client")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const p = new PrismaClient({ datasources: { db: { url: `file:${DB_PATH}` } } })

const migrations = [
  // whatsapp_connections — adiciona profile_pic_url se não existe
  `ALTER TABLE whatsapp_connections ADD COLUMN profile_pic_url TEXT`,
  `ALTER TABLE whatsapp_connections ADD COLUMN profile_name TEXT`,
  // leads — verifica campos comuns que podem ter mudado
  `ALTER TABLE leads ADD COLUMN first_contact_at DATETIME`,
  // users — campos que podem faltar
  `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
  `ALTER TABLE users ADD COLUMN company_id TEXT`,
  // notifications
  `ALTER TABLE notifications ADD COLUMN link TEXT`,
  // conversations
  `ALTER TABLE conversations ADD COLUMN unread_count INTEGER DEFAULT 0`,
  `ALTER TABLE conversations ADD COLUMN is_pinned BOOLEAN DEFAULT 0`,
  `ALTER TABLE conversations ADD COLUMN is_archived BOOLEAN DEFAULT 0`,
  `ALTER TABLE conversations ADD COLUMN auto_stop_bot BOOLEAN DEFAULT 0`,
  `ALTER TABLE conversations ADD COLUMN tags TEXT`,
  `ALTER TABLE conversations ADD COLUMN sentiment TEXT`,
  `ALTER TABLE conversations ADD COLUMN priority TEXT`,
  `ALTER TABLE conversations ADD COLUMN labels TEXT`,
]

async function main() {
  let applied = 0
  let skipped = 0

  for (const sql of migrations) {
    try {
      await p.$executeRawUnsafe(sql)
      console.log(`✓ ${sql.substring(0, 60)}...`)
      applied++
    } catch (e) {
      if (e.message?.includes("duplicate column")) {
        skipped++
      } else {
        console.log(`- Ignorado: ${e.message?.substring(0, 80)}`)
        skipped++
      }
    }
  }

  console.log(`\n${applied} migrações aplicadas, ${skipped} ignoradas`)
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
