/**
 * Patch v3 — corrige arquivos com problemas específicos:
 * 1. `req` → `request` quando o parâmetro se chama `request`
 * 2. funções auxiliares que usam `prisma` sem tê-lo definido
 * 3. remove declarações de prisma duplicadas ou mal posicionadas
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

  // 1. Corrige `getPrismaFromRequest(req)` → `getPrismaFromRequest(request)` 
  //    quando o handler usa `request` como parâmetro
  // Detecta se os handlers usam `request: NextRequest` ou `req: NextRequest`
  const usesRequest = /export async function \w+\s*\(\s*request\s*:/m.test(modified)
  const usesReq = /export async function \w+\s*\(\s*req\s*:/m.test(modified)

  if (usesRequest && !usesReq) {
    // Todos os handlers usam `request` — corrige chamadas que passaram `req`
    modified = modified.replace(/getPrismaFromRequest\(req\)/g, "getPrismaFromRequest(request)")
  }

  // 2. Remove patches duplicados na mesma função
  // Se tiver duas linhas `const prisma = await getPrismaFromRequest` seguidas ou próximas, mantém apenas uma
  modified = modified.replace(/(const prisma = await getPrismaFromRequest\([^)]+\)\n)([ \t]*const prisma = await getPrismaFromRequest\([^)]+\)\n)/g, "$1")

  // 3. Para funções auxiliares (não export) que usam `prisma` sem definição,
  //    adiciona `prisma` como parâmetro ou usa defaultPrisma
  // Estratégia: detecta `async function X(` sem export que usa prisma
  // e passa prisma via parâmetro desde o handler que o chama — muito complexo para regex
  // Alternativa simples: importa defaultPrisma para uso em helpers
  if (modified.includes("async function ") && !modified.includes("export async function")) {
    // Arquivo tem apenas funções não-export — não é um handler direto
    return { skipped: true }
  }

  // Detecta se há funções auxiliares (sem export) que usam prisma
  const hasHelperWithPrisma = /^(?!export\s)async function.*\n(?:[\s\S]*?)prisma\./m.test(modified)
  
  if (hasHelperWithPrisma) {
    // Adiciona import do prisma default para as funções auxiliares
    if (!modified.includes('from "@/lib/prisma"') && !modified.includes("from '@/lib/prisma'")) {
      modified = modified.replace(
        'import { getPrismaFromRequest } from "@/lib/prisma-tenant"',
        'import { getPrismaFromRequest } from "@/lib/prisma-tenant"\nimport { prisma as defaultPrisma } from "@/lib/prisma"'
      )
      // Nas funções auxiliares, usa defaultPrisma
      // Isso é um workaround — idealmente passaria prisma como parâmetro
      modified = modified.replace(
        /^((?!export\s)(?:async )?function [^(]+\([^)]*\)[^{]*\{[\s\S]*?)\bprisma\b(?=\.)/gm,
        (m, prefix) => m.replace(/\bprisma\b(?=\.)/g, "defaultPrisma")
      )
    }
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
console.log(`\n${patched} atualizados, ${skipped} ignorados`)
