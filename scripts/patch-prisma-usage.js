/**
 * Segundo passo: nos arquivos que já têm getPrismaFromRequest importado,
 * envolve cada handler async para obter o prisma do tenant.
 * 
 * Estratégia: adiciona `const prisma = await getPrismaFromRequest(req)` 
 * no início de cada função GET/POST/PUT/DELETE/PATCH que ainda usa `prisma.`
 */

const fs = require("fs")
const path = require("path")

const API_DIR = path.join(process.cwd(), "src", "app", "api")
const SKIP_DIRS = ["admin", "auth", "register"]

function getAllRouteFiles(dir) {
  const results = []
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
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

  // Só processa arquivos com getPrismaFromRequest importado
  if (!content.includes("getPrismaFromRequest")) return { skipped: true }
  
  // Já foi patchado (tem `const prisma = await getPrismaFromRequest`)
  if (content.includes("const prisma = await getPrismaFromRequest")) return { skipped: true }

  // Injeta `const prisma = await getPrismaFromRequest(req)` logo após o try { no início de cada handler
  // Pattern: export async function (GET|POST|PUT|DELETE|PATCH)(req: NextRequest...) {\n  try {
  let modified = content.replace(
    /(export async function (?:GET|POST|PUT|DELETE|PATCH)\([^)]*req[^)]*\)[^{]*\{\s*\n)([ \t]*try \{)/g,
    (match, funcHeader, tryLine) => {
      const indent = tryLine.match(/^([ \t]*)/)[1]
      return `${funcHeader}${tryLine}\n${indent}  const prisma = await getPrismaFromRequest(req)`
    }
  )

  // Se não encontrou o padrão com try, tenta sem try (handlers simples)
  if (modified === content) {
    modified = content.replace(
      /(export async function (?:GET|POST|PUT|DELETE|PATCH)\([^)]*req[^)]*\)[^{]*\{\s*\n)([ \t]+)(?!const prisma)/,
      (match, funcHeader, indent) => {
        return `${funcHeader}${indent}const prisma = await getPrismaFromRequest(req)\n${indent}`
      }
    )
  }

  if (modified === content) return { skipped: true }

  fs.writeFileSync(filePath, modified, "utf8")
  return { patched: true }
}

const files = getAllRouteFiles(API_DIR)
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
