/**
 * Patch v2 — abordagem mais simples e robusta
 * Para cada arquivo que usa getPrismaFromRequest:
 * 1. Remove a linha `const prisma = await getPrismaFromRequest(req)` se existir (limpa patch anterior)
 * 2. Adiciona `const prisma = await getPrismaFromRequest(req)` logo após cada `export async function X(req`
 *    dentro do primeiro bloco { da função
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
    if (fs.statSync(full).isDirectory()) {
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

  if (!content.includes("getPrismaFromRequest")) return { skipped: true }

  // Remove patches anteriores incorretos
  content = content.replace(/\n[ \t]*const prisma = await getPrismaFromRequest\(req\)\n/g, "\n")

  // Injeta após a abertura de cada handler de export async function
  // Procura: `export async function GET/POST/PUT/DELETE/PATCH(` ... `) {` e adiciona na primeira linha útil
  const handlerRegex = /(export async function (?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)[^{]*\{)(\s*\n)([ \t]*)/g

  let modified = content.replace(handlerRegex, (match, header, newline, indent) => {
    return `${header}${newline}${indent}const prisma = await getPrismaFromRequest(req)\n${indent}`
  })

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

console.log(`\n${patched} atualizados, ${skipped} ignorados`)
