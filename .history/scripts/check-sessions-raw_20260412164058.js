const Database = require("better-sqlite3")
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const db = new Database(DB_PATH, { readonly: true })

// Ver colunas da tabela whatsapp_connections
const cols = db.prepare("PRAGMA table_info(whatsapp_connections)").all()
console.log("Colunas em whatsapp_connections:")
cols.forEach(c => console.log(`  ${c.name} (${c.type})`))

// Ver dados
const rows = db.prepare("SELECT id, name, status FROM whatsapp_connections").all()
console.log("\nConexões:")
rows.forEach(r => console.log(`  ${r.name} | ${r.status}`))

db.close()
