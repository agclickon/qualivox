/**
 * Testa diretamente o initSession para a conexão Iasmin
 */
process.env.DATABASE_URL = "file:./prisma/dev.db"

const CONN_ID = "71193bbe-cfb0-45dc-a753-f33fd1cf787c"

async function main() {
  const { getPrismaForConnection } = await import("../src/lib/prisma-tenant.ts").catch(() => null) ||
    { getPrismaForConnection: null }

  if (!getPrismaForConnection) {
    console.log("Não conseguiu importar - testando via HTTP")

    const http = require("http")
    // Simula a chamada que o frontend faz (sem auth - espera 307)
    const options = {
      hostname: "localhost",
      port: 3000,
      path: `/api/whatsapp/connect?connectionId=${CONN_ID}`,
      method: "GET"
    }
    const req = http.request(options, res => {
      let d = ""
      res.on("data", c => d += c)
      res.on("end", () => {
        console.log("Status:", res.statusCode)
        try { console.log("Body:", JSON.stringify(JSON.parse(d), null, 2)) }
        catch { console.log("Body raw:", d.substring(0, 500)) }
      })
    })
    req.on("error", e => console.error("Erro:", e.message))
    req.end()
    return
  }

  console.log("Buscando banco para conexão", CONN_ID)
  const db = await getPrismaForConnection(CONN_ID)
  const conn = await db.whatsappConnection.findUnique({ where: { id: CONN_ID } })
  console.log("Conexão encontrada:", conn?.name, conn?.status, "session:", conn?.session?.length || 0, "bytes")
}

main().catch(e => { console.error(e); process.exit(1) })
