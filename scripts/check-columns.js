// Verifica e adiciona colunas se necessário
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando colunas...');
  
  let needsUpdate = false;
  
  // Verifica description
  try {
    await prisma.$queryRaw`SELECT description FROM saas_plans LIMIT 1`;
    console.log('✅ description OK');
  } catch {
    console.log('⚠️ Adicionando description...');
    await prisma.$executeRaw`ALTER TABLE saas_plans ADD COLUMN description TEXT`;
    needsUpdate = true;
  }
  
  // Verifica max_storage
  try {
    await prisma.$queryRaw`SELECT max_storage FROM saas_plans LIMIT 1`;
    console.log('✅ max_storage OK');
  } catch {
    console.log('⚠️ Adicionando max_storage...');
    await prisma.$executeRaw`ALTER TABLE saas_plans ADD COLUMN max_storage INTEGER DEFAULT 1024`;
    needsUpdate = true;
  }
  
  // Verifica custom_features
  try {
    await prisma.$queryRaw`SELECT custom_features FROM saas_companies LIMIT 1`;
    console.log('✅ custom_features OK');
  } catch {
    console.log('⚠️ Adicionando custom_features...');
    await prisma.$executeRaw`ALTER TABLE saas_companies ADD COLUMN custom_features TEXT`;
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    console.log('✅ Colunas adicionadas!');
  } else {
    console.log('✅ Todas as colunas já existem!');
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
