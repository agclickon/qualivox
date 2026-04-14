import makeWASocket, { WASocket, Browsers, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, isJidBroadcast, useMultiFileAuthState } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import NodeCache from "node-cache"
import pino from "pino"
import { PrismaClient } from "@prisma/client"
import path from "path"
import fs from "fs"

const logger = pino({ level: "warn" })
const sessions = new Map<string, WASocket>()
const connectedIds = new Set<string>()
const prisma = new PrismaClient()

// Auth storage directory
const AUTH_DIR = process.env.AUTH_DIR || "./auth"

export function getSessionStatus(id: string): string {
  if (connectedIds.has(id)) return "CONNECTED"
  if (sessions.has(id)) return "CONNECTING"
  return "DISCONNECTED"
}

export async function removeSession(id: string) {
  const s = sessions.get(id)
  if (s) {
    try { s.ws.close() } catch { }
    sessions.delete(id)
  }
  connectedIds.delete(id)
}

export async function initSession(connectionId: string, onEvent: (e: string, d: any) => void): Promise<{ status: string; qrCode?: string }> {
  if (connectedIds.has(connectionId)) return { status: "CONNECTED" }
  if (sessions.has(connectionId)) await removeSession(connectionId)

  const conn = await prisma.whatsappConnection.findUnique({ where: { id: connectionId } })
  if (!conn) throw new Error("Connection not found")

  await prisma.whatsappConnection.update({ where: { id: connectionId }, data: { status: "OPENING" } })

  // Setup auth state
  const authPath = path.join(AUTH_DIR, connectionId)
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(authPath)

  const { version } = await fetchLatestBaileysVersion()
  const msgRetryCounterCache = new NodeCache()

  const sock = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Desktop"),
    version,
    msgRetryCounterCache,
    shouldIgnoreJid: (jid: string) => isJidBroadcast(jid),
    auth: state,
  }) as WASocket

  sock.ev.on("creds.update", saveCreds)
  sessions.set(connectionId, sock)

  return new Promise((resolve, reject) => {
    let resolved = false
    let qrRetries = 0

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr !== undefined) {
        qrRetries++
        if (qrRetries > 3) {
          await removeSession(connectionId)
          if (!resolved) { resolved = true; reject(new Error("QR retries exceeded")) }
          return
        }
        onEvent("qr", { qr, attempt: qrRetries })
        if (!resolved) { resolved = true; resolve({ status: "qrcode", qrCode: qr }) }
      }

      if (connection === "open") {
        const user = (sock as any).user
        const phone = user?.id?.split(":")[0] || null
        await prisma.whatsappConnection.update({ where: { id: connectionId }, data: { status: "CONNECTED", phoneNumber: phone, qrcode: "" } })
        connectedIds.add(connectionId)
        onEvent("connected", { phoneNumber: phone, connectionId })
        if (!resolved) { resolved = true; resolve({ status: "CONNECTED" }) }
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode
        const reconnect = code !== DisconnectReason.loggedOut && code !== 403 && code !== 440
        connectedIds.delete(connectionId)
        sessions.delete(connectionId)
        await prisma.whatsappConnection.update({ where: { id: connectionId }, data: { status: reconnect ? "OPENING" : "DISCONNECTED" } })
        onEvent("disconnected", { connectionId, reason: code, willReconnect: reconnect })
        if (reconnect) setTimeout(() => initSession(connectionId, onEvent).catch(console.error), 5000)
      }
    })

    sock.ev.on("messages.upsert", (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          onEvent("message", { connectionId, message: msg, from: msg.key.remoteJid, timestamp: msg.messageTimestamp })
        }
      }
    })
  })
}

export async function getSession(id: string): Promise<WASocket | undefined> {
  return connectedIds.has(id) ? sessions.get(id) : undefined
}
