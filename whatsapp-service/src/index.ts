import express from "express"
import { PrismaClient } from "@prisma/client"
import { initSession, getSessionStatus, removeSession } from "./session"
import { sendMessage } from "./actions"
import axios from "axios"

const app = express()
app.use(express.json())

const prisma = new PrismaClient()
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://qualivox.com.br/api/whatsapp/webhook"

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "whatsapp", timestamp: new Date().toISOString() })
})

// Listar conexões ativas
app.get("/connections", async (req, res) => {
  try {
    const connections = await prisma.whatsappConnection.findMany({
      select: { id: true, name: true, status: true, phoneNumber: true, isDefault: true }
    })
    
    const withStatus = connections.map(conn => ({
      ...conn,
      realStatus: getSessionStatus(conn.id)
    }))
    
    res.json({ connections: withStatus })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Conectar uma instância
app.post("/connect/:connectionId", async (req, res) => {
  try {
    const { connectionId } = req.params
    const connection = await prisma.whatsappConnection.findUnique({
      where: { id: connectionId }
    })
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" })
    }
    
    // Inicializa sessão
    const result = await initSession(connectionId, async (event, data) => {
      // Envia webhook para Vercel
      try {
        await axios.post(WEBHOOK_URL, { event, data, connectionId }, {
          timeout: 10000
        })
      } catch (err) {
        console.error("[Webhook] Failed:", err.message)
      }
    })
    
    res.json({ success: true, status: result.status, qrCode: result.qrCode || null })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Desconectar
app.post("/disconnect/:connectionId", async (req, res) => {
  try {
    const { connectionId } = req.params
    await removeSession(connectionId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Enviar mensagem
app.post("/send/:connectionId", async (req, res) => {
  try {
    const { connectionId } = req.params
    const { phone, message, options } = req.body
    
    const result = await sendMessage(connectionId, phone, message, options)
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Inicializa conexões existentes ao iniciar
async function initializeExistingConnections() {
  console.log("[Init] Checking existing connections...")
  
  const connections = await prisma.whatsappConnection.findMany({
    where: { status: { in: ["CONNECTED", "OPENING"] } }
  })
  
  for (const conn of connections) {
    console.log(`[Init] Reconnecting ${conn.name}...`)
    try {
      await initSession(conn.id, async (event, data) => {
        try {
          await axios.post(WEBHOOK_URL, { event, data, connectionId: conn.id }, {
            timeout: 10000
          })
        } catch (err) {
          console.error("[Webhook] Failed:", err.message)
        }
      })
    } catch (err) {
      console.error(`[Init] Failed to reconnect ${conn.name}:`, err)
    }
  }
}

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[WhatsApp Service] Running on port ${PORT}`)
  initializeExistingConnections()
})
