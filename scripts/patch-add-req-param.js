/**
 * Corrige handlers que não têm parâmetro req mas chamam getPrismaFromRequest(req)
 * Adiciona req: NextRequest como primeiro parâmetro
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

  // Padrão: handler sem parâmetro que chama getPrismaFromRequest com nome errado
  // export async function GET() { → export async function GET(req: NextRequest) {
  // export async function GET({ params }) { → export async function GET(req: NextRequest, { params }) {
  
  // Corrige handlers com apenas `{ params }` (sem req)
  modified = modified.replace(
    /export async function (GET|POST|PUT|DELETE|PATCH)\s*\(\s*\{\s*params\s*\}/g,
    "export async function $1(req: NextRequest, { params }"
  )
  
  // Corrige handlers completamente sem parâmetros
  modified = modified.replace(
    /export async function (GET|POST|PUT|DELETE|PATCH)\s*\(\s*\)/g,
    "export async function $1(req: NextRequest)"
  )

  // Garante que NextRequest está importado
  if (modified.includes("req: NextRequest") && !modified.includes("NextRequest")) {
    modified = modified.replace(
      'import { NextResponse }',
      'import { NextRequest, NextResponse }'
    )
    if (!modified.includes("NextRequest")) {
      modified = "import { NextRequest } from \"next/server\"\n" + modified
    }
  }

  // Agora corrige todos getPrismaFromRequest com nome errado → usa `req`
  modified = modified.replace(
    /const prisma = await getPrismaFromRequest\(\w+\)/g,
    "const prisma = await getPrismaFromRequest(req)"
  )

  // Para handlers que usam `request` como parâmetro, corrige de volta
  // Se o handler usa `request:` como parâmetro, usa `request`
  // Faz o replace função por função
  const lines = modified.split("\n")
  const result = []
  let currentParam = "req"
  
  for (const line of lines) {
    const handlerMatch = line.match(/export async function \w+\s*\((\w+)\s*:/)
    if (handlerMatch) {
      currentParam = handlerMatch[1]
    }
    result.push(line.replace(
      /const prisma = await getPrismaFromRequest\(\w+\)/,
      `const prisma = await getPrismaFromRequest(${currentParam})`
    ))
  }
  
  modified = result.join("\n")

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
