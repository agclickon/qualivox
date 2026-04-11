const { execSync } = require('child_process')
const path = require('path')

const tsNode = path.join(__dirname, 'node_modules', '.bin', 'ts-node.cmd')
const seedFile = path.join(__dirname, 'prisma', 'seed.ts')

console.log('Rodando seed...\n')

try {
  execSync(`"${tsNode}" --compiler-options "{\\"module\\":\\"CommonJS\\"}" "${seedFile}"`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, DOTENV_CONFIG_PATH: path.join(__dirname, '.env') }
  })
  console.log('\nSeed finalizado!')
} catch (e) {
  console.error('Erro:', e.message)
  process.exit(1)
}
