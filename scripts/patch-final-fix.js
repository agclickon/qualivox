/**
 * Fix final definitivo: lê cada arquivo linha por linha,
 * rastreia o nome EXATO do primeiro parâmetro de cada handler,
 * e corrige getPrismaFromRequest(X) para usar o parâmetro correto.
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
  const content = fs.readFileSync(filePath, "utf8")
  if (!content.includes("getPrismaFromRequest")) return { skipped: true }

  const lines = content.split("\n")
  const result = []
  let changed = false
  
  // Stack para rastrear qual é o req param do handler atual
  // Detecta `export async function X(PARAM` em linha(s) possivelmente multi-linha
  let pendingHandler = false
  let currentReqParam = null
  let handlerBuffer = ""

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Detecta início de export async function
    if (/^export async function (GET|POST|PUT|DELETE|PATCH)/.test(line)) {
      pendingHandler = true
      handlerBuffer = line
    } else if (pendingHandler) {
      handlerBuffer += "\n" + line
    }

    // Quando temos o buffer completo (linha com {), extrai o primeiro parâmetro
    if (pendingHandler && handlerBuffer.includes("{")) {
      pendingHandler = false
      // Extrai primeiro parâmetro: export async function X(PARAM
      const paramMatch = handlerBuffer.match(/export async function \w+\s*\(\s*(\w+)/)
      if (paramMatch) {
        currentReqParam = paramMatch[1]
      }
      handlerBuffer = ""
    }

    // Corrige getPrismaFromRequest(QUALQUER) → getPrismaFromRequest(PARAM_CORRETO)
    if (line.includes("getPrismaFromRequest(") && currentReqParam) {
      const fixed = line.replace(
        /getPrismaFromRequest\(\w*\)/,
        `getPrismaFromRequest(${currentReqParam})`
      )
      if (fixed !== line) {
        line = fixed
        changed = true
      }
    }

    result.push(line)
  }

  if (!changed) return { skipped: true }

  // Garante NextRequest importado
  let modified = result.join("\n")
  if (modified.includes("req: NextRequest") && !/import.*NextRequest/.test(modified)) {
    modified = modified.replace(
      /import \{ (NextResponse[^}]*) \} from "next\/server"/,
      'import { NextRequest, $1 } from "next/server"'
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
