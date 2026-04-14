if (!process.env.WS_NO_BUFFER_UTIL) {
  process.env.WS_NO_BUFFER_UTIL = "1"
}
if (!process.env.WS_NO_UTF_8_VALIDATE) {
  process.env.WS_NO_UTF_8_VALIDATE = "1"
}

import makeWASocket, {
  WASocket,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  BufferJSON,
  initAuthCreds,
  proto,
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import NodeCache from "node-cache"
import pino from "pino"
import QRCode from "qrcode"
import { prisma } from "@/lib/prisma"
import { getPrismaForConnection } from "@/lib/prisma-tenant"

const logger = pino({ level: "warn" })

type Session = WASocket & {
  id?: string
}

// Use globalThis to survive Next.js HMR recompilations
const globalForBaileys = globalThis as unknown as {
  __baileys_sessions?: Map<string, Session>
  __baileys_connected?: Set<string>
  __baileys_retries?: Map<string, number>
  __baileys_hooks?: Map<string, (session: Session) => void>
  __baileys_initLocks?: Map<string, Promise<Session>>
  __baileys_teardownCbs?: Set<(connectionId: string) => void>
}

// sessions holds ALL active sockets (connecting + connected) to prevent GC
const sessions: Map<string, Session> = globalForBaileys.__baileys_sessions ??= new Map()
// connectedIds tracks only truly connected sessions
const connectedIds: Set<string> = globalForBaileys.__baileys_connected ??= new Set()
const retriesQrCodeMap = globalForBaileys.__baileys_retries ??= new Map<string, number>()
const sessionHooks: Map<string, (session: Session) => void> = globalForBaileys.__baileys_hooks ??= new Map()

export function registerSessionHook(
  connectionId: string,
  hook: (session: Session) => void
) {
  console.log(`[Baileys] Registering session hook for ${connectionId}`)
  sessionHooks.set(connectionId, hook)
  const existing = sessions.get(connectionId)
  if (existing) {
    try {
      console.log(`[Baileys] Running session hook immediately for ${connectionId}`)
      hook(existing)
    } catch (err) {
      console.error(`[Baileys] Error running session hook for ${connectionId}`, err)
    }
  }
}

// SSE subscribers - listeners for real-time events
type SSECallback = (event: string, data: unknown) => void
const sseSubscribers: Set<SSECallback> = new Set()

export function subscribeSSE(cb: SSECallback) {
  sseSubscribers.add(cb)
  return () => { sseSubscribers.delete(cb) }
}

function emitSSE(event: string, data: unknown) {
  for (const cb of sseSubscribers) {
    try { cb(event, data) } catch { /* ignore */ }
  }
}

// Auth state from DB (like suia's authState.ts)
const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  "pre-key": "preKeys",
  session: "sessions",
  "sender-key": "senderKeys",
  "app-state-sync-key": "appStateSyncKeys",
  "app-state-sync-version": "appStateVersions",
  "sender-key-memory": "senderKeyMemory",
  "lid-mapping": "lidMapping",
  "device-list": "deviceList",
  tctoken: "tctoken",
}

async function loadAuthState(connectionId: string, db?: typeof prisma): Promise<{
  state: AuthenticationState
  saveState: () => Promise<void>
}> {
  const p = db ?? prisma
  const conn = await p.whatsappConnection.findUnique({
    where: { id: connectionId },
  })

  let creds: AuthenticationCreds
  type StoredKeys = Record<string, Record<string, unknown>>
  let keys: Record<string, unknown> = {}

  if (conn?.session && conn.session.length > 2) {
    try {
      const result = JSON.parse(conn.session, BufferJSON.reviver)
      creds = result.creds
      keys = result.keys
    } catch {
      creds = initAuthCreds()
      keys = {}
    }
  } else {
    creds = initAuthCreds()
    keys = {}
  }

  const saveState = async () => {
    try {
      await p.whatsappConnection.update({
        where: { id: connectionId },
        data: {
          session: JSON.stringify({ creds, keys }, BufferJSON.replacer, 0),
        },
      })
    } catch (err) {
      console.error("[Baileys] Error saving session:", err)
    }
  }

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const key = KEY_MAP[type]
          const store = keys as StoredKeys
          return ids.reduce((dict: Record<string, SignalDataTypeMap[T]>, id) => {
            let value = store[key]?.[id]
            if (value) {
              if (type === "app-state-sync-key") {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              dict[id] = value as SignalDataTypeMap[T]
            }
            return dict
          }, {} as Record<string, SignalDataTypeMap[T]>)
        },
        set: async (data: Partial<Record<keyof SignalDataTypeMap, Record<string, unknown>>>) => {
          const store = keys as StoredKeys
          for (const category in data) {
            const key = KEY_MAP[category as keyof SignalDataTypeMap]
            if (!key) continue
            store[key] = store[key] || {}
            Object.assign(store[key], data[category as keyof SignalDataTypeMap])
          }
          await saveState()
        },
      },
    },
    saveState,
  }
}

export function getSession(connectionId: string): Session | undefined {
  return connectedIds.has(connectionId) ? sessions.get(connectionId) : undefined
}

export function getSessionPhoneNumber(connectionId: string): string | null {
  const session = sessions.get(connectionId)
  if (!session) return null
  try {
    const userId: string | undefined = (session as any).user?.id
    if (!userId) return null
    return userId.split(":")[0]?.split("@")[0] ?? null
  } catch {
    return null
  }
}

export async function getSessionProfilePicUrl(connectionId: string): Promise<string | null> {
  const session = sessions.get(connectionId)
  if (!session) return null
  try {
    const userId: string | undefined = (session as any).user?.id
    if (!userId) return null
    const jid = userId.includes("@") ? userId.split(":")[0] + "@s.whatsapp.net" : userId + "@s.whatsapp.net"
    const url = await (session as any).profilePictureUrl(jid, "image")
    return url ?? null
  } catch {
    return null
  }
}

// makeInMemoryStore foi removido no Baileys v7 — retorna undefined sempre
export function getContactFromStore(_connectionId: string, _jid: string): undefined {
  return undefined
}

// Allow listener module to clear its guard when a session is torn down
const sessionTeardownCallbacks: Set<(connectionId: string) => void> = globalForBaileys.__baileys_teardownCbs ??= new Set()
export function onSessionTeardown(cb: (connectionId: string) => void) {
  sessionTeardownCallbacks.add(cb)
}

export async function removeSession(
  connectionId: string,
  doLogout = true
): Promise<void> {
  const session = sessions.get(connectionId)
  if (session) {
    try {
      if (doLogout) {
        await session.logout()
        session.ws.close()
      }
    } catch { /* ignore */ }
    sessions.delete(connectionId)
  }
  connectedIds.delete(connectionId)
  retriesQrCodeMap.delete(connectionId)
  // Notify listener module to clear its guard
  for (const cb of sessionTeardownCallbacks) {
    try { cb(connectionId) } catch { /* ignore */ }
  }
}

// Mutex per connection to prevent concurrent initSession calls
const initLocks: Map<string, Promise<Session>> = globalForBaileys.__baileys_initLocks ??= new Map()

export function initSession(connectionId: string): Promise<Session> {
  // If there's already an init in progress for this connection, return that promise
  const existing = initLocks.get(connectionId)
  if (existing) {
    console.log(`[Baileys] initSession already in progress for ${connectionId}, reusing`)
    return existing
  }

  const promise = _initSessionInternal(connectionId).finally(() => {
    initLocks.delete(connectionId)
  })
  initLocks.set(connectionId, promise)
  return promise
}

async function _initSessionInternal(connectionId: string): Promise<Session> {
  // If session already exists and is connected, just return it
  const existingSession = sessions.get(connectionId)
  if (existingSession) {
    console.log(`[Baileys] Session already exists for ${connectionId}, returning existing`)
    return existingSession
  }

  // Resolve o banco correto para esta conexão (pode ser banco isolado de tenant)
  const db = await getPrismaForConnection(connectionId)

  const conn = await db.whatsappConnection.findUnique({
    where: { id: connectionId },
  })
  if (!conn) throw new Error("Connection not found: " + connectionId)

  await db.whatsappConnection.update({
    where: { id: connectionId },
    data: { status: "OPENING" },
  })

  emitSSE("connection_update", { connectionId, status: "OPENING" })

  const { version } = await fetchLatestBaileysVersion()
  const { state, saveState } = await loadAuthState(connectionId, db)

  const msgRetryCounterCache = new NodeCache()

  const wsocket = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: Browsers.appropriate("Desktop"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
    msgRetryCounterCache,
    shouldIgnoreJid: (jid: string) => isJidBroadcast(jid),
  }) as Session

  wsocket.id = connectionId

  // Store in sessions immediately to keep a strong reference (prevents GC during QR phase)
  // getSession() only returns sockets in connectedIds, so this does NOT report false "CONNECTED"
  sessions.set(connectionId, wsocket)

  // Run hook with wsocket directly
  const hook = sessionHooks.get(connectionId)
  if (hook) {
    try {
      console.log(`[Baileys] Executing session hook for ${connectionId}`)
      hook(wsocket)
    } catch (err) {
      console.error(`[Baileys] Error executing session hook for ${connectionId}`, err)
    }
  } else {
    console.warn(`[Baileys] No session hook registered for ${connectionId}`)
  }

  // Connection update handler
  wsocket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    console.log(`[Baileys] ${conn.name} connection: ${connection || ""} qr: ${qr ? "yes" : "no"}`)

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      console.warn(
        `[Baileys] Conexão ${conn.name} encerrada. status=${statusCode ?? "unknown"}`,
        lastDisconnect?.error
      )

      connectedIds.delete(connectionId)
      if (statusCode === 403) {
        // Banned/forbidden
        await db.whatsappConnection.update({
          where: { id: connectionId },
          data: { status: "PENDING", session: "" },
        })
        sessions.delete(connectionId)
        emitSSE("connection_update", { connectionId, status: "PENDING" })
      } else if (statusCode === 440) {
        // Stream conflict — another socket already connected, don't retry
        console.warn(`[Baileys] Stream conflict for ${conn.name}, not retrying (another session active)`)
        sessions.delete(connectionId)
      } else if (statusCode !== DisconnectReason.loggedOut) {
        // Reconnect only if no session already exists
        sessions.delete(connectionId)
        setTimeout(() => {
          if (!sessions.has(connectionId)) {
            initSession(connectionId)
          }
        }, 3000)
      } else {
        // Logged out
        await db.whatsappConnection.update({
          where: { id: connectionId },
          data: { status: "PENDING", session: "", qrcode: "" },
        })
        sessions.delete(connectionId)
        emitSSE("connection_update", { connectionId, status: "DISCONNECTED" })
      }
    }

    if (connection === "open") {
      const userId = wsocket.user?.id
      const phoneNumber = userId?.split(":")[0]?.split("@")[0] ?? null

      // Busca foto de perfil da própria conexão automaticamente
      let profilePicUrl: string | null = null
      try {
        const jid = userId?.includes("@") ? userId.split(":")[0] + "@s.whatsapp.net" : (userId ?? "") + "@s.whatsapp.net"
        profilePicUrl = await (wsocket as any).profilePictureUrl(jid, "image") ?? null
      } catch { /* sem foto disponível */ }

      await db.whatsappConnection.update({
        where: { id: connectionId },
        data: {
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          ...(phoneNumber ? { phoneNumber } : {}),
          ...(profilePicUrl ? { profilePicUrl } : {}),
        },
      })
      sessions.set(connectionId, wsocket)
      connectedIds.add(connectionId)
      retriesQrCodeMap.delete(connectionId)

      console.log(`[Baileys] ${conn.name} CONNECTED phone=${phoneNumber} pic=${profilePicUrl ? "✓" : "null"}`)
      emitSSE("connection_update", { connectionId, status: "CONNECTED", phoneNumber, profilePicUrl })
    }

    if (qr !== undefined) {
      const retries = retriesQrCodeMap.get(connectionId) || 0

      if (retries >= 3) {
        await db.whatsappConnection.update({
          where: { id: connectionId },
          data: { status: "DISCONNECTED", qrcode: "" },
        })
        wsocket.ev.removeAllListeners("connection.update")
        wsocket.ws.close()
        sessions.delete(connectionId)
        connectedIds.delete(connectionId)
        retriesQrCodeMap.delete(connectionId)
        emitSSE("connection_update", { connectionId, status: "DISCONNECTED" })
      } else {
        retriesQrCodeMap.set(connectionId, retries + 1)

        await db.whatsappConnection.update({
          where: { id: connectionId },
          data: { qrcode: qr, status: "qrcode", retries: 0 },
        })

        console.log(`[Baileys] QR code generated for ${conn.name} (attempt ${retries + 1})`)
        let qrBase64: string | null = null
        try {
          const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
          qrBase64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "")
        } catch { /* ignore */ }
        emitSSE("qrcode", { connectionId, qr, qrBase64 })
      }
    }
  })

  // Save credentials on update
  wsocket.ev.on("creds.update", saveState)

  return wsocket
}

export type { Session }
