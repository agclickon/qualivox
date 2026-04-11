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

export type { Company, Plan, TenantDatabase, AdminAuditLog } from "@prisma/client"
