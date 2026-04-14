/**
 * Corrige `getPrismaFromRequest(req/request/_req/_request)` para usar o nome correto do parâmetro
 * em cada handler
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

  let modified = content

  // Encontra todos os export async function e descobre o nome do primeiro parâmetro
  // Substitui getPrismaFromRequest(xxx) pelo nome correto
  modified = modified.replace(
    /(export async function \w+\s*\(\s*)(\w+)\s*(?::|,|\))/g,
    (match, prefix, paramName) => {
      // Este é o nome real do primeiro parâmetro
      // Não modifica a assinatura, apenas salva para uso abaixo
      return match
    }
  )

  // Abordagem mais direta: processa função por função
  const handlerRegex = /export async function (\w+)\s*\((\w+)[^)]*\)[^{]*\{[\s\S]*?(?=\nexport async function|\Z)/g
  
  let result = content
  
  // Para cada handler, garante que getPrismaFromRequest usa o nome correto do req param
  const funcRegex = /export async function (\w+)\s*\((\w+)\s*[^)]*\)/g
  let match
  while ((match = funcRegex.exec(content)) !== null) {
    const paramName = match[2] // nome do primeiro parâmetro (req, request, _req, etc.)
    // Substitui getPrismaFromRequest com qualquer argumento pelo nome correto nesta função
    // Encontra a linha imediatamente após esta função
    const funcStart = match.index
    const afterFunc = content.indexOf("\nexport async function", funcStart + 1)
    const funcBody = content.substring(funcStart, afterFunc === -1 ? content.length : afterFunc)
    
    const fixedBody = funcBody.replace(
      /const prisma = await getPrismaFromRequest\((\w+)\)/g,
      `const prisma = await getPrismaFromRequest(${paramName})`
    )
    
    if (fixedBody !== funcBody) {
      result = result.substring(0, funcStart) + fixedBody + result.substring(afterFunc === -1 ? content.length : afterFunc)
    }
  }

  if (result === content) return { skipped: true }
  
  fs.writeFileSync(filePath, result, "utf8")
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
