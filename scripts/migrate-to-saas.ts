/**
 * Script de migração para SaaS Multi-tenant
 * 
 * Vincula usuários existentes à empresa "default" e cria a empresa se não existir.
 * 
 * Uso: npx ts-node scripts/migrate-to-saas.ts
 */

import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()

async function migrateToSaaS() {
  console.log("🚀 Iniciando migração para SaaS Multi-tenant...\n")

  try {
    // 1. Verifica se o plano Starter existe (fallback)
    let starterPlan = await prisma.saasPlan.findUnique({
      where: { name: "Starter" }
    })

    if (!starterPlan) {
      console.log("⚠️ Plano Starter não encontrado. Criando...")
      starterPlan = await prisma.saasPlan.create({
        data: {
          id: crypto.randomUUID(),
          name: "Starter",
          priceMonthly: 2900,
          maxLeads: 50,
          maxUsers: 2,
          maxWhatsappConnections: 1,
          maxAgents: 1,
          features: JSON.stringify({
            calendar_enabled: true,
            voice_enabled: false,
            webhooks_enabled: false,
            api_access: false,
            white_label: false
          })
        }
      })
      console.log("✅ Plano Starter criado:", starterPlan.id)
    } else {
      console.log("✅ Plano Starter encontrado:", starterPlan.id)
    }

    // 2. Verifica se a empresa "default" existe
    let defaultCompany = await prisma.saasCompany.findUnique({
      where: { slug: "default" }
    })

    if (!defaultCompany) {
      console.log("\n⚠️ Empresa 'default' não encontrada. Criando...")
      defaultCompany = await prisma.saasCompany.create({
        data: {
          id: "default",
          name: "Empresa Padrão",
          slug: "default",
          email: "admin@default.com",
          planId: starterPlan.id,
          status: "active",
          trialEndsAt: null
        }
      })
      console.log("✅ Empresa 'default' criada:", defaultCompany.id)
    } else {
      console.log("✅ Empresa 'default' encontrada:", defaultCompany.id)
    }

    // 3. Vincula usuários sem companyId à empresa default
    const usersWithoutCompany = await prisma.user.findMany({
      where: {
        OR: [
          { companyId: null },
          { companyId: "" }
        ]
      },
      select: { id: true, email: true, name: true }
    })

    console.log(`\n📊 Encontrados ${usersWithoutCompany.length} usuários sem empresa vinculada`)

    if (usersWithoutCompany.length > 0) {
      console.log("\nVinculando usuários à empresa 'default'...")
      
      for (const user of usersWithoutCompany) {
        await prisma.user.update({
          where: { id: user.id },
          data: { companyId: "default" }
        })
        console.log(`  ✅ ${user.email || user.name || user.id}`)
      }
    }

    // 4. Verifica se há super_admin (primeiro usuário vira super_admin se não houver nenhum)
    const superAdminCount = await prisma.user.count({
      where: { role: "super_admin" }
    })

    if (superAdminCount === 0) {
      console.log("\n⚠️ Nenhum super_admin encontrado.")
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true }
      })
      
      if (firstUser) {
        await prisma.user.update({
          where: { id: firstUser.id },
          data: { role: "super_admin" }
        })
        console.log(`✅ Primeiro usuário (${firstUser.email}) promovido a super_admin`)
      }
    } else {
      console.log(`✅ ${superAdminCount} super_admin(s) encontrado(s)`)
    }

    // 5. Log de auditoria
    await prisma.saasAuditLog.create({
      data: {
        companyId: "default",
        actorEmail: "system@migration",
        action: "saas_migration",
        resource: "saas_company",
        resourceId: "default",
        details: JSON.stringify({
          usersMigrated: usersWithoutCompany.length,
          plan: "Starter",
          timestamp: new Date().toISOString()
        })
      }
    })

    console.log("\n🎉 Migração concluída com sucesso!")
    console.log("\n📋 Resumo:")
    console.log(`  • Empresa 'default': ${defaultCompany.id}`)
    console.log(`  • Plano: ${starterPlan.name}`)
    console.log(`  • Usuários vinculados: ${usersWithoutCompany.length}`)
    console.log(`  • Super admins: ${superAdminCount || 1}`)
    console.log("\n💡 Próximos passos:")
    console.log("  1. Acesse /admin para gerenciar empresas")
    console.log("  2. Vá em /configuracoes/plano para ver seu plano")
    console.log("  3. Cadastre novas empresas via /registrar-empresa")

  } catch (error) {
    console.error("\n❌ Erro na migração:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateToSaaS()
