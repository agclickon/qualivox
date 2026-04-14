/**
 * Patch final — nos arquivos que já têm defaultPrisma importado mas ainda têm `prisma.` solto,
 * substitui `prisma.` por `defaultPrisma.` APENAS fora de funções que já definem `const prisma = await getPrismaFromRequest`
 */

const fs = require("fs")
const path = require("path")

const targets = [
  "src/app/api/profile/password/route.ts",
  "src/app/api/profile/route.ts",
  "src/app/api/templates/[id]/route.ts",
  "src/app/api/templates/route.ts",
  "src/app/api/webhooks/route.ts",
  "src/app/api/whatsapp/connect/route.ts",
  "src/app/api/whatsapp/conversations/route.ts",
  "src/app/api/whatsapp/send/media/route.ts",
]

for (const rel of targets) {
  const filePath = path.join(process.cwd(), rel)
  if (!fs.existsSync(filePath)) { console.log(`Não encontrado: ${rel}`); continue }

  let content = fs.readFileSync(filePath, "utf8")

  // Adiciona import de defaultPrisma se ainda não tem
  if (!content.includes("defaultPrisma") && !content.includes('from "@/lib/prisma"')) {
    content = content.replace(
      'import { getPrismaFromRequest } from "@/lib/prisma-tenant"',
      'import { getPrismaFromRequest } from "@/lib/prisma-tenant"\nimport { prisma as defaultPrisma } from "@/lib/prisma"'
    )
  }

  // Em funções que usam `request` como parâmetro, corrige `getPrismaFromRequest(req)` → `(request)`
  if (/export async function \w+\s*\(\s*request\s*:/m.test(content)) {
    content = content.replace(/getPrismaFromRequest\(req\)/g, "getPrismaFromRequest(request)")
  }

  // Substitui `prisma.` por `defaultPrisma.` onde `prisma` não é declarado como variável local no escopo
  // Estratégia: split por funções, em funções que não têm `const prisma =`, faz o replace
  const lines = content.split("\n")
  let depth = 0
  let inHandlerWithPrisma = false
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detecta início de export async function com const prisma na próxima linha
    if (/export async function/.test(line)) {
      // Olha as próximas 3 linhas para ver se tem `const prisma = await getPrismaFromRequest`
      const lookahead = lines.slice(i, i + 4).join("\n")
      inHandlerWithPrisma = lookahead.includes("const prisma = await getPrismaFromRequest")
    }

    // Se não estamos num handler com prisma definido, substitui `prisma.` por `defaultPrisma.`
    if (!inHandlerWithPrisma) {
      result.push(line.replace(/\bprisma\./g, "defaultPrisma."))
    } else {
      result.push(line)
    }

    // Conta profundidade de chaves para saber quando sai do handler
    for (const ch of line) {
      if (ch === "{") depth++
      if (ch === "}") {
        depth--
        if (depth <= 0) {
          depth = 0
          inHandlerWithPrisma = false
        }
      }
    }
  }

  const modified = result.join("\n")
  if (modified !== content) {
    fs.writeFileSync(filePath, modified, "utf8")
    console.log(`✓ ${rel}`)
  } else {
    console.log(`- ${rel} (sem mudanças)`)
  }
}
