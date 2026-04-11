export type UserRole = "super_admin" | "admin" | "user"

export type LeadStatus =
  | "novo"
  | "contatado"
  | "qualificado"
  | "em_negociacao"
  | "proposta_enviada"
  | "fechado_ganho"
  | "fechado_perdido"

export type QualificationLevel = "quente" | "morno" | "frio" | "nao_qualificado"

export type LeadSource =
  | "whatsapp"
  | "website"
  | "indicacao"
  | "telefone"
  | "email"
  | "rede_social"
  | "evento"
  | "outro"

export type UrgencyLevel = "baixa" | "media" | "alta" | "critica"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string | null
  phone?: string | null
}

export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DashboardMetrics {
  totalLeads: number
  newLeadsToday: number
  conversionRate: number
  averageScore: number
  leadsByStatus: Record<string, number>
  leadsBySource: Record<string, number>
}
