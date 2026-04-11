#!/usr/bin/env node
/**
 * Backup automático do banco SQLite antes de operações destrutivas.
 * Uso: node scripts/db-backup.js [--restore <arquivo>]
 */

const fs = require("fs")
const path = require("path")

const DB_PATH = path.join(__dirname, "../prisma/dev.db")
const BACKUP_DIR = path.join(__dirname, "../prisma/backups")
const MAX_BACKUPS = 10 // mantém os 10 mais recentes

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19)
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("dev.db.") && f.endsWith(".bak"))
    .sort()
    .reverse() // mais recente primeiro
}

function backup() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("[backup] Banco não encontrado, nada a fazer.")
    return
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const dest = path.join(BACKUP_DIR, `dev.db.${timestamp()}.bak`)
  fs.copyFileSync(DB_PATH, dest)

  const size = (fs.statSync(dest).size / 1024).toFixed(1)
  console.log(`[backup] ✅ Backup criado: ${path.basename(dest)} (${size} KB)`)

  // Remove backups antigos além do limite
  const all = listBackups()
  if (all.length > MAX_BACKUPS) {
    const toDelete = all.slice(MAX_BACKUPS)
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f))
      console.log(`[backup] 🗑️  Backup antigo removido: ${f}`)
    }
  }
}

function restore(filename) {
  const src = filename.includes(path.sep)
    ? filename
    : path.join(BACKUP_DIR, filename)

  if (!fs.existsSync(src)) {
    console.error(`[backup] ❌ Arquivo não encontrado: ${src}`)
    process.exit(1)
  }

  // Salva o banco atual como backup de segurança antes de restaurar
  if (fs.existsSync(DB_PATH)) {
    const safeguard = path.join(BACKUP_DIR, `dev.db.before-restore_${timestamp()}.bak`)
    fs.copyFileSync(DB_PATH, safeguard)
    console.log(`[backup] 🛡️  Banco atual salvo em: ${path.basename(safeguard)}`)
  }

  fs.copyFileSync(src, DB_PATH)
  console.log(`[backup] ✅ Banco restaurado de: ${path.basename(src)}`)
}

function list() {
  const backups = listBackups()
  if (backups.length === 0) {
    console.log("[backup] Nenhum backup encontrado.")
    return
  }
  console.log(`[backup] ${backups.length} backup(s) disponível(is):`)
  backups.forEach((f, i) => {
    const fullPath = path.join(BACKUP_DIR, f)
    const size = (fs.statSync(fullPath).size / 1024).toFixed(1)
    console.log(`  ${i === 0 ? "→" : " "} ${f} (${size} KB)`)
  })
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args[0] === "--restore" && args[1]) {
  restore(args[1])
} else if (args[0] === "--list") {
  list()
} else {
  backup()
}
