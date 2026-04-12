/**
 * Migração suave do SaaS — Adiciona campos sem perder dados
 * 
 * Execute: npx ts-node scripts/migrate-saas-soft.ts
 */

import { prisma } from "../src/lib/prisma"

async function migrate() {
  console.log("🔄 Iniciando migração suave do SaaS...")

  try {
    // 1. Verifica se as colunas já existem tentando consultar
    console.log("📋 Verificando estrutura atual...")
    
    // Testa se description existe
    let hasDescription = false
    let hasMaxStorage = false
    let hasCustomFeatures = false
    
    try {
      await prisma.$queryRaw`SELECT description FROM saas_plans LIMIT 1`
      hasDescription = true
      console.log("✅ Coluna 'description' já existe")
    } catch {
      console.log("⚠️ Coluna 'description' não existe, será criada")
    }

    try {
      await prisma.$queryRaw`SELECT max_storage FROM saas_plans LIMIT 1`
      hasMaxStorage = true
      console.log("✅ Coluna 'max_storage' já existe")
    } catch {
      console.log("⚠️ Coluna 'max_storage' não existe, será criada")
    }

    try {
      await prisma.$queryRaw`SELECT custom_features FROM saas_companies LIMIT 1`
      hasCustomFeatures = true
      console.log("✅ Coluna 'custom_features' já existe")
    } catch {
      console.log("⚠️ Coluna 'custom_features' não existe, será criada")
    }

    // 2. Adiciona colunas que faltam usando raw SQL
    if (!hasDescription) {
      console.log("🔧 Adicionando 'description' à tabela saas_plans...")
      await prisma.$executeRaw`ALTER TABLE saas_plans ADD COLUMN description TEXT`
      console.log("✅ Coluna 'description' adicionada")
    }

    if (!hasMaxStorage) {
      console.log("🔧 Adicionando 'max_storage' à tabela saas_plans...")
      await prisma.$executeRaw`ALTER TABLE saas_plans ADD COLUMN max_storage INTEGER DEFAULT 1024`
      console.log("✅ Coluna 'max_storage' adicionada com valor padrão 1024")
    }

    if (!hasCustomFeatures) {
      console.log("🔧 Adicionando 'custom_features' à tabela saas_companies...")
      await prisma.$executeRaw`ALTER TABLE saas_companies ADD COLUMN custom_features TEXT`
      console.log("✅ Coluna 'custom_features' adicionada")
    }

    // 3. Atualiza planos existentes com valores padrão para maxStorage
    console.log("📝 Atualizando planos existentes...")
    
    await prisma.$executeRaw`
      UPDATE saas_plans 
      SET max_storage = CASE 
        WHEN name = 'Starter' THEN 1024
        WHEN name = 'Pro' THEN 5120
        WHEN name = 'Enterprise' THEN 20480
        ELSE 1024
      END
      WHERE max_storage IS NULL OR max_storage = 0
    `
    console.log("✅ Planos atualizados com storage padrão")

    // 4. Verifica se planos padrão existem, cria se não existirem
    const existingPlans = await prisma.saasPlan.findMany()
    console.log(`📊 Encontrados ${existingPlans.length} planos`)

    if (existingPlans.length === 0) {
      console.log("⚠️ Nenhum plano encontrado! Criando planos padrão...")
      
      await prisma.saasPlan.createMany({
        data: [
          {
            name: "Starter",
            description: "Para pequenas empresas iniciando",
            priceMonthly: 2900,
            maxUsers: 2,
            maxAgents: 2,
            maxLeads: 500,
            maxWhatsappConnections: 1,
            maxStorage: 1024,
            features: JSON.stringify({
              calendar_enabled: true,
              voice_enabled: false,
              webhooks_enabled: false,
              api_access: false,
              white_label: false
            })
          },
          {
            name: "Pro",
            description: "Para empresas em crescimento",
            priceMonthly: 9900,
            maxUsers: 5,
            maxAgents: 5,
            maxLeads: 3000,
            maxWhatsappConnections: 3,
            maxStorage: 5120,
            features: JSON.stringify({
              calendar_enabled: true,
              voice_enabled: true,
              webhooks_enabled: true,
              api_access: true,
              white_label: false
            })
          },
          {
            name: "Enterprise",
            description: "Para grandes empresas",
            priceMonthly: 29900,
            maxUsers: 20,
            maxAgents: 20,
            maxLeads: 20000,
            maxWhatsappConnections: 10,
            maxStorage: 20480,
            features: JSON.stringify({
              calendar_enabled: true,
              voice_enabled: true,
              webhooks_enabled: true,
              api_access: true,
              white_label: true
            })
          }
        ]
      })
      console.log("✅ Planos padrão criados")
    }

    // 5. Cria empresa default se não existir
    const defaultCompany = await prisma.saasCompany.findUnique({
      where: { id: "default" }
    })

    if (!defaultCompany && existingPlans.length > 0) {
      console.log("⚠️ Empresa default não encontrada. Criando...")
      const proPlan = await prisma.saasPlan.findFirst({ where: { name: "Pro" } })
      
      if (proPlan) {
        await prisma.saasCompany.create({
          data: {
            id: "default",
            name: "Empresa Default",
            slug: "default",
            email: "admin@leadflow.com",
            planId: proPlan.id,
            status: "active"
          }
        })
        console.log("✅ Empresa default criada")
      }
    }

    console.log("\n🎉 Migração concluída com sucesso!")
    console.log("✅ Todos os dados foram preservados")
    console.log("✅ Novas colunas adicionadas")
    console.log("✅ Planos atualizados")
    
  } catch (error) {
    console.error("\n❌ Erro na migração:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
