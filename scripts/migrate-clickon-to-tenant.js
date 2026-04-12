/**
 * Migra dados da Clickon do banco default para o banco isolado do tenant
 * Uso: node scripts/migrate-clickon-to-tenant.js
 */

const { PrismaClient } = require("@prisma/client")
const path = require("path")
const fs = require("fs")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const TENANTS_DIR = path.join(process.cwd(), "data", "tenants")
const DB_PATH = path.join(TENANTS_DIR, `leadflow-${COMPANY_ID}.db`)

const defaultPrisma = new PrismaClient()
const tenantPrisma = new PrismaClient({
  datasources: { db: { url: `file:${DB_PATH}` } }
})

async function migrate() {
  if (!fs.existsSync(DB_PATH)) {
    console.error("Banco do tenant não encontrado:", DB_PATH)
    process.exit(1)
  }

  console.log("=== Migrando dados para tenant Clickon ===\n")

  // 1. Usuários (exceto super_admin que ficam no default)
  const users = await defaultPrisma.user.findMany({
    where: { companyId: COMPANY_ID }
  })
  console.log(`Usuários a migrar: ${users.length}`)
  for (const u of users) {
    try {
      await tenantPrisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO users (id, email, password_hash, name, phone, role, avatar_url, is_active, email_verified, last_login, company_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        u.id, u.email, u.passwordHash, u.name, u.phone || null, u.role,
        u.avatarUrl || null, u.isActive ? 1 : 0, u.emailVerified ? 1 : 0,
        u.lastLogin ? u.lastLogin.toISOString() : null,
        u.companyId || null,
        u.createdAt.toISOString(), u.updatedAt.toISOString()
      )
      console.log(`  ✓ Usuário: ${u.email}`)
    } catch (e) {
      console.log(`  ✗ Usuário ${u.email}: ${e.message}`)
    }
  }

  // 2. Agentes IA
  const agents = await defaultPrisma.agent.findMany()
  console.log(`\nAgentes a migrar: ${agents.length}`)
  for (const a of agents) {
    try {
      await tenantPrisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO agents (id, name, description, system_prompt, tone, mode, provider, model, temperature, max_tokens, escalate_threshold, connection_ids, is_active, voice_enabled, voice_mode, voice_id, voice_speed, voice_stability, voice_similarity, avatar_url, created_by_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        a.id, a.name, a.description || null, a.systemPrompt, a.tone, a.mode,
        a.provider || null, a.model || null, a.temperature, a.maxTokens, a.escalateThreshold,
        a.connectionIds, a.isActive ? 1 : 0, a.voiceEnabled ? 1 : 0, a.voiceMode,
        a.voiceId || null, a.voiceSpeed, a.voiceStability, a.voiceSimilarity,
        a.avatarUrl || null, a.createdById || null,
        a.createdAt.toISOString(), a.updatedAt.toISOString()
      )
      console.log(`  ✓ Agente: ${a.name}`)
    } catch (e) {
      console.log(`  ✗ Agente ${a.name}: ${e.message}`)
    }
  }

  // 3. Conexões WhatsApp
  const connections = await defaultPrisma.whatsappConnection.findMany()
  console.log(`\nConexões WhatsApp a migrar: ${connections.length}`)
  for (const c of connections) {
    try {
      await tenantPrisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO whatsapp_connections (id, name, phone_number, status, qr_code, session_data, integration_id, default_attendant_id, baileys_status, profile_name, profile_pic_url, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id, c.name, c.phoneNumber || null, c.status, c.qrCode || null,
        c.sessionData || null, c.integrationId || null, c.defaultAttendantId || null,
        c.baileysStatus || null, c.profileName || null, c.profilePicUrl || null,
        c.isDefault ? 1 : 0, c.createdAt.toISOString(), c.updatedAt.toISOString()
      )
      console.log(`  ✓ Conexão: ${c.name}`)
    } catch (e) {
      console.log(`  ✗ Conexão ${c.name}: ${e.message}`)
    }
  }

  // 4. Leads
  const leads = await defaultPrisma.lead.findMany()
  console.log(`\nLeads a migrar: ${leads.length}`)
  let leadsOk = 0
  for (const l of leads) {
    try {
      await tenantPrisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO leads (id, name, email, phone, whatsapp, company, position, status, qualification, source, urgency, value, notes, assigned_to_id, created_by_id, first_connection_id, pipeline_stage_id, lost_reason, converted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        l.id, l.name, l.email || null, l.phone || null, l.whatsapp || null,
        l.company || null, l.position || null, l.status, l.qualification,
        l.source, l.urgency, l.value, l.notes || null,
        l.assignedToId || null, l.createdById || null, l.firstConnectionId || null,
        l.pipelineStageId || null, l.lostReason || null,
        l.convertedAt ? l.convertedAt.toISOString() : null,
        l.createdAt.toISOString(), l.updatedAt.toISOString()
      )
      leadsOk++
    } catch (e) {
      // silencia leads individuais
    }
  }
  console.log(`  ✓ ${leadsOk}/${leads.length} leads migrados`)

  // 5. Settings
  const settings = await defaultPrisma.setting.findMany()
  console.log(`\nSettings a migrar: ${settings.length}`)
  for (const s of settings) {
    try {
      await tenantPrisma.$executeRawUnsafe(
        `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
        s.key, s.value, s.updatedAt.toISOString()
      )
    } catch {}
  }
  console.log(`  ✓ Settings migrados`)

  await defaultPrisma.$disconnect()
  await tenantPrisma.$disconnect()

  console.log("\n=== Migração concluída! ===")
  console.log("Reinicie o servidor para aplicar as mudanças.")
}

migrate().catch(e => {
  console.error("Erro:", e)
  process.exit(1)
})
