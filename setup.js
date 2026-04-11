const { execSync } = require('child_process')
const path = require('path')

const prismaPath = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js')

console.log('=== LeadFlow Setup ===\n')

try {
  console.log('1. Gerando Prisma Client...')
  execSync(`node "${prismaPath}" generate`, { stdio: 'inherit', cwd: __dirname })
  console.log('   OK!\n')
} catch (e) {
  console.error('Erro ao gerar Prisma Client:', e.message)
  process.exit(1)
}

try {
  console.log('2. Criando banco SQLite + tabelas...')
  execSync(`node "${prismaPath}" db push --accept-data-loss`, { stdio: 'inherit', cwd: __dirname })
  console.log('   OK!\n')
} catch (e) {
  console.error('Erro ao criar banco:', e.message)
  process.exit(1)
}

try {
  console.log('3. Populando banco (seed)...')
  execSync('node -e "require(\'ts-node\').register({compilerOptions:{module:\'CommonJS\'}});require(\'./prisma/seed.ts\')"', { stdio: 'inherit', cwd: __dirname })
  console.log('   OK!\n')
} catch (e) {
  console.log('   Seed via ts-node falhou, tentando alternativa...')
  try {
    execSync(`node "${prismaPath}" db seed`, { stdio: 'inherit', cwd: __dirname })
    console.log('   OK!\n')
  } catch (e2) {
    console.error('   Erro no seed (pode ser executado manualmente):', e2.message)
  }
}

console.log('=== Setup concluído! ===')
console.log('Execute: node node_modules/next/dist/bin/next dev')
console.log('Acesse: http://localhost:3000')
console.log('Login: admin@leadflow.com / admin123')
