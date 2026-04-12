/**
 * Tenant Management — Fase 12 SaaS Multi-tenant
 * 
 * Responsabilidades:
 * - Resolver qual tenant (companyId) o usuário pertence
 * - Factory de PrismaClient por tenant (conexão isolada por empresa)
 * - Cache de instâncias Prisma para performance
 * - Provisionamento de novos tenants (criar banco isolado)
 */

import { PrismaClient } from "@prisma/client"
import path from "path"
import fs from "fs"
import { prisma as defaultPrisma } from "./prisma"

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const DATA_DIR = path.join(process.cwd(), "data")
const TENANTS_DIR = path.join(DATA_DIR, "tenants")

// Garante que os diretórios existem
if (!fs.existsSync(TENANTS_DIR)) {
  fs.mkdirSync(TENANTS_DIR, { recursive: true })
}

// ============================================================
// CACHE DE PRISMA POR TENANT
// ============================================================

interface TenantPrismaInstance {
  prisma: PrismaClient
  lastUsed: number
}

const tenantCache = new Map<string, TenantPrismaInstance>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos de inatividade para liberar

// Cleanup periódico de conexões inativas (a cada 10 minutos)
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [companyId, instance] of tenantCache.entries()) {
      if (now - instance.lastUsed > CACHE_TTL_MS) {
        instance.prisma.$disconnect().catch(() => {})
        tenantCache.delete(companyId)
        console.log(`[Tenant] Conexão liberada por inatividade: ${companyId}`)
      }
    }
  }, 10 * 60 * 1000)
}

// ============================================================
// RESOLUÇÃO DE TENANT
// ============================================================

export interface TenantContext {
  companyId: string
  dbPath: string
  isDefault: boolean
}

/**
 * Resolve o tenant de um usuário autenticado.
 * Retorna o companyId e caminho do banco.
 * 
 * Regras:
 * - Se companyId existir no User → usa esse tenant
 * - Se não tiver companyId → fallback para "default" (compatibilidade)
 * - Se impersonating → usa o tenant da empresa alvo
 */
export async function resolveTenant(userId: string): Promise<TenantContext | null> {
  // Busca o usuário no banco default para saber seu companyId
  const user = await defaultPrisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true }
  })

  if (!user) return null

  // Se não tem companyId vinculado, usa o tenant "default" (compatibilidade)
  const companyId = user.companyId ?? "default"
  const isDefault = companyId === "default"

  // Caminho do arquivo .db do tenant
  const dbPath = isDefault
    ? path.join(process.cwd(), "prisma", "dev.db") // Banco atual como default
    : path.join(TENANTS_DIR, `leadflow-${companyId}.db`)

  return {
    companyId,
    dbPath,
    isDefault
  }
}

/**
 * Retorna a URL de conexão para um tenant
 */
export function getTenantDatabaseUrl(dbPath: string): string {
  return `file:${dbPath}`
}

// ============================================================
// FACTORY DE PRISMA POR TENANT
// ============================================================

/**
 * Retorna uma instância PrismaClient configurada para o tenant específico.
 * Usa cache para reutilizar conexões.
 */
export async function getPrismaForTenant(companyId: string): Promise<PrismaClient> {
  // Verifica cache
  const cached = tenantCache.get(companyId)
  if (cached) {
    cached.lastUsed = Date.now()
    return cached.prisma
  }

  // Determina o caminho do banco
  const isDefault = companyId === "default"
  const dbPath = isDefault
    ? path.join(process.cwd(), "prisma", "dev.db")
    : path.join(TENANTS_DIR, `leadflow-${companyId}.db`)

  // Verifica se o banco existe (segurança)
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Banco do tenant não encontrado: ${dbPath}`)
  }

  // Cria nova instância Prisma
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: getTenantDatabaseUrl(dbPath)
      }
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  })

  // Testa a conexão
  await prisma.$queryRaw`SELECT 1`

  // Armazena no cache
  tenantCache.set(companyId, {
    prisma,
    lastUsed: Date.now()
  })

  console.log(`[Tenant] Nova conexão criada: ${companyId} (${dbPath})`)
  return prisma
}

/**
 * Versão síncrona que retorna do cache ou lança erro.
 * Útil em contexts onde não podemos await (raramente usado).
 */
export function getPrismaForTenantSync(companyId: string): PrismaClient {
  const cached = tenantCache.get(companyId)
  if (cached) {
    cached.lastUsed = Date.now()
    return cached.prisma
  }
  throw new Error(`Prisma para tenant ${companyId} não está em cache. Use getPrismaForTenant() primeiro.`)
}

// ============================================================
// PROVISIONAMENTO DE TENANT
// ============================================================

export interface ProvisionTenantInput {
  companyId: string
  companyName: string
  adminUserId: string
  adminEmail: string
  adminName: string
}

/**
 * Provisiona um novo tenant:
 * 1. Cria o arquivo .db
 * 2. Copia o schema do banco default como template
 * 3. Cria o usuário admin inicial
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<string> {
  const { companyId, companyName, adminUserId, adminEmail, adminName } = input

  const dbPath = path.join(TENANTS_DIR, `leadflow-${companyId}.db`)

  // Verifica se já existe
  if (fs.existsSync(dbPath)) {
    throw new Error(`Tenant já provisionado: ${companyId}`)
  }

  // Copia o banco default como template (schema completo)
  const defaultDbPath = path.join(process.cwd(), "prisma", "dev.db")
  fs.copyFileSync(defaultDbPath, dbPath)

  console.log(`[Tenant] Banco criado: ${dbPath}`)

  // Conecta ao novo banco
  const tenantPrisma = await getPrismaForTenant(companyId)

  // Limpa dados do template — ordem respeita dependências FK
  // Nota: SQLite não tem TRUNCATE, usamos DELETE
  const tablesToClean = [
    // Dependentes primeiro
    "agent_knowledge_chunks",
    "agent_knowledge",
    "agents",
    "webhook_deliveries",
    "webhooks",
    "automation_logs",
    "automations",
    "event_reminders",
    "calendar_events",
    "calendar_integrations",
    "follow_ups",
    "ai_analyses",
    "conversation_transfers",
    "lead_tags",
    "notifications",
    "audit_logs",
    "chat_messages",
    "messages",
    "interactions",
    "conversations",
    "whatsapp_connections",
    "whatsapp_integrations",
    "refresh_tokens",
    "lgpd_consents",
    "tags",
    "pipeline_stages",
    "leads",
    "message_templates",
    "users",
    "settings",
    // Tabelas SaaS não devem existir no tenant isolado, mas limpa por segurança
    "saas_audit_logs",
    "saas_companies",
    "saas_plans"
  ]

  for (const table of tablesToClean) {
    try {
      await tenantPrisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
    } catch {
      // Ignora erros de tabela não existir
    }
  }

  console.log(`[Tenant] Dados do template limpos`)

  // Cria o usuário admin inicial no tenant
  // Nota: A senha deve ser definida posteriormente ou via convite
  await tenantPrisma.user.create({
    data: {
      id: adminUserId, // Mesmo ID do banco central para consistência
      email: adminEmail,
      name: adminName,
      role: "admin", // Admin do tenant
      passwordHash: "", // Será definido no primeiro login
      isActive: true
    }
  })

  console.log(`[Tenant] Usuário admin criado: ${adminEmail}`)

  // Seed de configurações padrão
  await tenantPrisma.setting.createMany({
    data: [
      { key: "company_name", value: companyName },
      { key: "tenant_id", value: companyId },
      { key: "created_at", value: new Date().toISOString() }
    ],
    skipDuplicates: true
  })

  return dbPath
}

// ============================================================
// HELPERS DE SEGURANÇA
// ============================================================

/**
 * Verifica se um usuário tem acesso a um tenant específico.
 * Usado em impersonation e validações de segurança.
 */
export async function verifyTenantAccess(
  userId: string,
  targetCompanyId: string
): Promise<boolean> {
  const user = await defaultPrisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true, role: true }
  })

  if (!user) return false

  // Super admin pode acessar qualquer tenant
  if (user.role === "super_admin") return true

  // Usuário normal só pode acessar seu próprio tenant
  return user.companyId === targetCompanyId
}

// ============================================================
// LIMPEZA E SHUTDOWN
// ============================================================

/**
 * Desconecta todos os Prisma clients de tenants (útil em testes/shutdown)
 */
export async function disconnectAllTenants(): Promise<void> {
  const promises: Promise<void>[] = []
  
  for (const [companyId, instance] of tenantCache.entries()) {
    promises.push(
      instance.prisma.$disconnect().catch((err) => {
        console.error(`[Tenant] Erro ao desconectar ${companyId}:`, err)
      })
    )
  }
  
  await Promise.all(promises)
  tenantCache.clear()
  console.log("[Tenant] Todas as conexões de tenants liberadas")
}
