import path from "path"
import fs from "fs"

// Lazy import para evitar erro quando ADMIN_DATABASE_URL não está configurado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminPrisma: any = null

function getAdminDbUrl(): string {
  if (process.env.ADMIN_DATABASE_URL) return process.env.ADMIN_DATABASE_URL
  const dbDir = path.join(process.cwd(), "data", "admin")
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  return `file:${path.join(dbDir, "leadflow-admin.db")}`
}

export async function getAdminPrisma() {
  if (_adminPrisma) return _adminPrisma

  const { PrismaClient } = await import("@prisma/client")

  // Injetamos a URL dinamicamente via env temporária
  const url = getAdminDbUrl()
  process.env.ADMIN_DATABASE_URL = url

  _adminPrisma = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

  return _adminPrisma
}

// Tipos locais (o schema-admin ainda não passou por prisma generate)
export interface AdminPlan {
  id: string
  name: string
  priceMonthly: number
  maxLeads: number
  maxUsers: number
  maxWhatsappConnections: number
  maxAgents: number
  features: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AdminCompany {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  cnpj: string | null
  planId: string
  status: string
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
  plan?: AdminPlan
  tenantDb?: AdminTenantDatabase | null
}

export interface AdminTenantDatabase {
  id: string
  companyId: string
  dbPath: string
  createdAt: Date
}

export interface AdminAuditLog {
  id: string
  companyId: string | null
  actorEmail: string
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  createdAt: Date
}
