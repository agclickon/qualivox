/**
 * Patcha todas as rotas de negócio para usar withTenant em vez de prisma global
 * Rotas excluídas: admin/*, auth/*, register
 */

const fs = require("fs")
const path = require("path")

const API_DIR = path.join(process.cwd(), "src", "app", "api")

// Rotas que devem usar banco CENTRAL (não tenant)
const SKIP_DIRS = ["admin", "auth", "register"]

function getAllRouteFiles(dir) {
  const results = []
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      // Pula rotas admin/auth
      if (SKIP_DIRS.includes(item)) continue
      results.push(...getAllRouteFiles(full))
    } else if (item === "route.ts") {
      results.push(full)
    }
  }
  return results
}

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8")

  // Já usa withTenant? Pula
  if (content.includes("withTenant")) return { skipped: true }

  // Não usa prisma? Pula
  if (!content.includes('from "@/lib/prisma"')) return { skipped: true }

  // Substitui import
  const newContent = content.replace(
    /import \{ prisma \} from "@\/lib\/prisma"/g,
    'import { getPrismaFromRequest } from "@/lib/prisma-tenant"'
  ).replace(
    /import \{ prisma, [^}]+ \} from "@\/lib\/prisma"/g,
    (match) => {
      // Extrai outros imports além de prisma
      const others = match.match(/\{([^}]+)\}/)[1]
        .split(",")
        .map(s => s.trim())
        .filter(s => s !== "prisma")
      const base = 'import { getPrismaFromRequest } from "@/lib/prisma-tenant"'
      return others.length > 0
        ? `import { ${others.join(", ")} } from "@/lib/prisma"\n${base}`
        : base
    }
  )

  if (newContent === content) return { skipped: true }

  fs.writeFileSync(filePath, newContent, "utf8")
  return { patched: true }
}

const files = getAllRouteFiles(API_DIR)
console.log(`Encontrados ${files.length} arquivos de rota\n`)

let patched = 0, skipped = 0
for (const f of files) {
  const rel = path.relative(process.cwd(), f)
  const result = patchFile(f)
  if (result.patched) {
    console.log(`✓ ${rel}`)
    patched++
  } else {
    skipped++
  }
}

console.log(`\n${patched} arquivos atualizados, ${skipped} ignorados`)
