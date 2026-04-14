/**
 * Script de migração SQLite → Supabase (PostgreSQL)
 * Lê dados do SQLite local e escreve no PostgreSQL do Supabase
 */
import Database from "better-sqlite3"
import { PrismaClient } from "@prisma/client"
import path from "path"

const SQLITE_PATH = path.join(__dirname, "..", "prisma", "dev.db")
const prisma = new PrismaClient() // usa DATABASE_URL do .env (Supabase)

interface TableInfo {
  name: string
  orderBy?: string
  dependencies?: string[]
}

// Ordem de migração respeitando foreign keys
const TABLES: TableInfo[] = [
  { name: "users" },
  { name: "refresh_tokens", dependencies: ["users"] },
  { name: "pipeline_stages" },
  { name: "whatsapp_integrations" },
  { name: "whatsapp_connections", dependencies: ["whatsapp_integrations", "users"] },
  { name: "leads", dependencies: ["users", "pipeline_stages", "whatsapp_connections"] },
  { name: "conversations", dependencies: ["leads", "whatsapp_connections", "users"] },
  { name: "messages", dependencies: ["conversations", "whatsapp_connections", "users"] },
  { name: "interactions", dependencies: ["leads", "users", "conversations", "whatsapp_connections"] },
  { name: "ai_analyses", dependencies: ["leads", "interactions", "conversations", "whatsapp_connections"] },
  { name: "conversation_transfers", dependencies: ["conversations", "users"] },
  { name: "tags", dependencies: ["users"] },
  { name: "lead_tags", dependencies: ["leads", "tags", "whatsapp_connections", "conversations"] },
  { name: "agents", dependencies: ["users"] },
  { name: "agent_knowledge", dependencies: ["agents"] },
  { name: "agent_knowledge_chunks", dependencies: ["agent_knowledge"] },
  { name: "message_templates", dependencies: ["users"] },
  { name: "follow_ups", dependencies: ["leads", "conversations", "message_templates"] },
  { name: "automations" },
  { name: "automation_logs", dependencies: ["automations"] },
  { name: "chat_messages", dependencies: ["users"] },
  { name: "notifications", dependencies: ["users"] },
  { name: "webhooks" },
  { name: "webhook_deliveries", dependencies: ["webhooks"] },
  { name: "audit_logs", dependencies: ["users"] },
  { name: "settings" },
  { name: "lgpd_consents" },
  { name: "saas_plans" },
  { name: "saas_companies", dependencies: ["saas_plans"] },
  { name: "saas_audit_logs", dependencies: ["saas_companies"] },
  { name: "calendar_integrations" },
  { name: "calendar_events" },
  { name: "event_reminders" },
]

function convertValue(val: any, colName: string): any {
  if (val === null || val === undefined) return null
  // SQLite stores booleans as 0/1
  if (typeof val === "number" && (colName.startsWith("is_") || colName === "email_verified" || colName === "granted" ||
      colName === "typing_delay" || colName === "mark_as_read" || colName === "split_messages" || colName === "voice_enabled" ||
      colName === "is_read" || colName === "is_group" || colName === "is_archived" || colName === "is_pinned")) {
    return val === 1
  }
  return val
}

async function main() {
  console.log("🔄 Migração SQLite → Supabase\n")
  console.log(`📁 SQLite: ${SQLITE_PATH}`)
  console.log(`🐘 PostgreSQL: ${process.env.DATABASE_URL?.substring(0, 60)}...\n`)

  const sqlite = new Database(SQLITE_PATH, { readonly: true })

  // Limpar todas as tabelas no Supabase (ordem reversa)
  console.log("🗑️  Limpando dados existentes no Supabase...")
  for (const table of [...TABLES].reverse()) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table.name}"`)
      console.log(`   ✓ ${table.name}`)
    } catch (e: any) {
      console.log(`   ⚠ ${table.name}: ${e.message?.substring(0, 80)}`)
    }
  }

  console.log("\n📤 Migrando dados...\n")

  let totalRows = 0

  for (const table of TABLES) {
    try {
      // Verificar se a tabela existe no SQLite
      const tableExists = sqlite.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(table.name) as any

      if (!tableExists) {
        console.log(`   ⏭️  ${table.name}: não existe no SQLite, pulando`)
        continue
      }

      const rows = sqlite.prepare(`SELECT * FROM "${table.name}"`).all() as any[]

      if (rows.length === 0) {
        console.log(`   ⏭️  ${table.name}: vazio`)
        continue
      }

      // Get column names
      const columns = Object.keys(rows[0])

      let inserted = 0
      let errors = 0

      for (const row of rows) {
        try {
          const values = columns.map(col => convertValue(row[col], col))
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
          const colNames = columns.map(c => `"${c}"`).join(", ")
          const query = `INSERT INTO "${table.name}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`

          await prisma.$executeRawUnsafe(query, ...values)
          inserted++
        } catch (e: any) {
          errors++
          if (errors <= 2) {
            console.log(`      ❌ Erro em ${table.name}: ${e.message?.substring(0, 100)}`)
          }
        }
      }

      totalRows += inserted
      const errMsg = errors > 0 ? ` (${errors} erros)` : ""
      console.log(`   ✅ ${table.name}: ${inserted}/${rows.length} registros${errMsg}`)
    } catch (e: any) {
      console.log(`   ❌ ${table.name}: ${e.message?.substring(0, 100)}`)
    }
  }

  sqlite.close()
  await prisma.$disconnect()

  console.log(`\n🎉 Migração concluída! ${totalRows} registros migrados.`)
}

main().catch(e => {
  console.error("Erro fatal:", e)
  process.exit(1)
})
