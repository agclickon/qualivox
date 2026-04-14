const sqlite3 = require("sqlite3").verbose()
const path = require("path")

const COMPANY_ID = "2f1a8058-25e8-48cc-9dcd-a20ac3b69456"
const DB_PATH = path.join(process.cwd(), "data", "tenants", `leadflow-${COMPANY_ID}.db`)

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY)

db.all("PRAGMA table_info(whatsapp_connections)", [], (err, cols) => {
  if (err) { console.error(err); return }
  console.log("Colunas em whatsapp_connections:")
  cols.forEach(c => console.log(`  ${c.name} (${c.type})`))

  db.all("SELECT id, name, status FROM whatsapp_connections", [], (err2, rows) => {
    if (err2) { console.error(err2); return }
    console.log("\nConexões:")
    rows.forEach(r => console.log(`  ${r.name} | ${r.status}`))
    db.close()
  })
})
