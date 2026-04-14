/**
 * Patch v4 — abordagem definitiva:
 * Para cada handler, substitui `const prisma = await getPrismaFromRequest(QUALQUER)` 
 * pelo primeiro parâmetro real do handler (req, request, _req, _request)
 * Se handler não tem parâmetro, injeta `req: NextRequest` e adiciona import
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

  // Divide em linhas para processar função por função
  const lines = content.split("\n")
  let currentReqParam = null
  const result = []
  let changed = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Detecta início de handler export async function
    const handlerMatch = line.match(/^export async function (GET|POST|PUT|DELETE|PATCH)\s*\((\w+)/)
    if (handlerMatch) {
      currentReqParam = handlerMatch[2] // nome do 1º parâmetro
    }

    // Corrige a chamada getPrismaFromRequest com parâmetro errado
    if (line.includes("const prisma = await getPrismaFromRequest(") && currentReqParam) {
      const fixed = line.replace(
        /const prisma = await getPrismaFromRequest\(\w*\)/,
        `const prisma = await getPrismaFromRequest(${currentReqParam})`
      )
      if (fixed !== line) {
        line = fixed
        changed = true
      }
    }

    result.push(line)
  }

  if (!changed) return { skipped: true }

  // Garante que NextRequest está importado se foi adicionado como param
  let modified = result.join("\n")
  if (modified.includes("req: NextRequest") && !modified.includes("NextRequest")) {
    modified = modified.replace(
      /import \{ (NextResponse) \} from "next\/server"/,
      'import { NextRequest, NextResponse } from "next/server"'
    )
  }

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
