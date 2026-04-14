/**
 * Fix final: substitui `getPrismaFromRequest(QUALQUER_COISA)` pelo parâmetro correto
 * de cada handler, usando regex lookahead para encontrar o nome certo
 */

const fs = require("fs")
const path = require("path")

const targets = [
  "src/app/api/agents/[id]/knowledge/[knowledgeId]/route.ts",
  "src/app/api/analytics/overview/route.ts",
  "src/app/api/automations/[id]/route.ts",
  "src/app/api/automations/route.ts",
  "src/app/api/leads/[id]/notes/route.ts",
  "src/app/api/leads/[id]/qualify/route.ts",
  "src/app/api/leads/[id]/route.ts",
  "src/app/api/pipeline/route.ts",
  "src/app/api/settings/route.ts",
  "src/app/api/webhooks/route.ts",
  "src/app/api/whatsapp/connections/[id]/route.ts",
  "src/app/api/whatsapp/connections/route.ts",
  "src/app/api/whatsapp/conversations/route.ts",
  "src/app/api/whatsapp/debug/route.ts",
  "src/app/api/whatsapp/disconnect/route.ts",
  "src/app/api/whatsapp/messages/[id]/route.ts",
]

for (const rel of targets) {
  const filePath = path.join(process.cwd(), rel)
  if (!fs.existsSync(filePath)) { console.log(`Não encontrado: ${rel}`); continue }

  let content = fs.readFileSync(filePath, "utf8")
  let modified = content

  // Para cada handler, encontra o parâmetro correto e corrige a chamada
  // Padrão: export async function X(PARAM : NextRequest
  modified = modified.replace(
    /export async function (\w+)\s*\((\w+)\s*[^)]*\)[^{]*\{[^\n]*\n[ \t]*const prisma = await getPrismaFromRequest\((\w+)\)/g,
    (match, funcName, paramName, wrongParam) => {
      return match.replace(`getPrismaFromRequest(${wrongParam})`, `getPrismaFromRequest(${paramName})`)
    }
  )

  if (modified !== content) {
    fs.writeFileSync(filePath, modified, "utf8")
    console.log(`✓ ${rel}`)
  } else {
    console.log(`- ${rel} (sem mudanças detectadas — verificar manualmente)`)
  }
}
