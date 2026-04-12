/**
 * API de Registro de Empresas — Fase 12 SaaS
 * 
 * POST /api/register
 * Cria uma nova empresa com trial de 14 dias no plano Pro
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { provisionTenant } from "@/lib/tenant"
import crypto from "crypto"

// Validação simples de CNPJ (apenas formato)
function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/[^\d]/g, "")
  return clean.length === 14
}

// Gera slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      companyName,
      cnpj,
      email,
      phone,
      adminName,
      adminEmail,
      password,
      planId,        // Novo: ID do plano escolhido
      trialDays,     // Novo: dias de trial (padrão 14)
      customFeatures // Novo: features personalizadas
    } = body

    // Validações básicas
    if (!companyName || !adminName || !adminEmail || !password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Campos obrigatórios não preenchidos" } },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: "WEAK_PASSWORD", message: "Senha deve ter pelo menos 8 caracteres" } },
        { status: 400 }
      )
    }

    if (cnpj && !isValidCNPJ(cnpj)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CNPJ", message: "CNPJ inválido" } },
        { status: 400 }
      )
    }

    // Verifica se email da empresa já existe
    const existingCompany = await prisma.saasCompany.findUnique({
      where: { email: adminEmail }
    })
    if (existingCompany) {
      return NextResponse.json(
        { success: false, error: { code: "EMAIL_EXISTS", message: "Este email já está registrado" } },
        { status: 409 }
      )
    }

    // Verifica se CNPJ já existe (se fornecido)
    if (cnpj) {
      const cleanCnpj = cnpj.replace(/[^\d]/g, "")
      const existingCnpj = await prisma.saasCompany.findUnique({
        where: { cnpj: cleanCnpj }
      })
      if (existingCnpj) {
        return NextResponse.json(
          { success: false, error: { code: "CNPJ_EXISTS", message: "Este CNPJ já está registrado" } },
          { status: 409 }
        )
      }
    }

    // Busca o plano escolhido ou usa Pro como padrão
    const selectedPlanId = planId
    let selectedPlan = null
    
    if (selectedPlanId) {
      selectedPlan = await prisma.saasPlan.findUnique({
        where: { id: selectedPlanId }
      })
    }
    
    // Fallback para Pro se plano não encontrado
    if (!selectedPlan) {
      selectedPlan = await prisma.saasPlan.findUnique({
        where: { name: "Pro" }
      })
    }
    
    if (!selectedPlan) {
      return NextResponse.json(
        { success: false, error: { code: "PLAN_NOT_FOUND", message: "Plano não encontrado. Contate o suporte." } },
        { status: 500 }
      )
    }

    // Gera IDs
    const companyId = crypto.randomUUID()
    const userId = crypto.randomUUID()
    const slug = generateSlug(companyName)

    // Calcula data do fim do trial (dias personalizados ou 14 padrão)
    const days = trialDays && !isNaN(trialDays) ? parseInt(trialDays) : 14
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + days)

    // Monta features customizadas se fornecidas
    let customFeaturesJson = selectedPlan.features
    if (customFeatures && typeof customFeatures === 'object') {
      try {
        const baseFeatures = JSON.parse(selectedPlan.features)
        const mergedFeatures = { ...baseFeatures, ...customFeatures }
        customFeaturesJson = JSON.stringify(mergedFeatures)
      } catch {
        // Mantém features do plano se erro
      }
    }

    // Cria a empresa no banco central
    const company = await prisma.saasCompany.create({
      data: {
        id: companyId,
        name: companyName,
        slug,
        email: adminEmail,
        phone: phone || null,
        cnpj: cnpj ? cnpj.replace(/[^\d]/g, "") : null,
        planId: selectedPlan.id,
        status: "trial",
        trialEndsAt,
        customFeatures: customFeaturesJson !== selectedPlan.features ? customFeaturesJson : null
      }
    })

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Cria o usuário admin no banco central
    await prisma.user.create({
      data: {
        id: userId,
        email: adminEmail,
        name: adminName,
        passwordHash,
        phone: phone || null,
        role: "admin", // Admin da empresa
        companyId: company.id,
        isActive: true,
        emailVerified: false
      }
    })

    // Provisiona o banco do tenant
    try {
      await provisionTenant({
        companyId: company.id,
        companyName: company.name,
        adminUserId: userId,
        adminEmail,
        adminName
      })
    } catch (provisionErr) {
      console.error("[Register] Erro ao provisionar tenant:", provisionErr)
      // Não falha o registro, mas loga o erro. O admin pode re-tentar depois.
    }

    // Log de auditoria
    await prisma.saasAuditLog.create({
      data: {
        companyId: company.id,
        actorEmail: adminEmail,
        action: "company_created",
        resource: "saas_company",
        resourceId: company.id,
        details: JSON.stringify({ plan: "Pro", trial: true, trialDays: 14 })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          status: company.status,
          trialEndsAt: company.trialEndsAt
        },
        message: "Empresa registrada com sucesso! Você tem 14 dias de trial no plano Pro."
      }
    }, { status: 201 })

  } catch (error) {
    console.error("[Register] Erro no registro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno ao processar registro" } },
      { status: 500 }
    )
  }
}
