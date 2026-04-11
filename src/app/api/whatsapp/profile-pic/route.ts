import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/baileys-session"
import { prisma } from "@/lib/prisma"

const globalForPics = globalThis as typeof globalThis & {
  __profilePicCache?: Map<string, { url: string | null; fetchedAt: number }>
}

function getCache() {
  if (!globalForPics.__profilePicCache) {
    globalForPics.__profilePicCache = new Map()
  }
  return globalForPics.__profilePicCache
}

const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes

// GET /api/whatsapp/profile-pic?jid=xxx - Get profile picture URL
export async function GET(request: NextRequest) {
  const jid = request.nextUrl.searchParams.get("jid")
  if (!jid) {
    return NextResponse.json({ success: true, url: null })
  }

  const cache = getCache()
  const cached = cache.get(jid)
  const now = Date.now()
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, url: cached.url })
  }

  try {
    const connection = await prisma.whatsappConnection.findFirst({
      where: { isDefault: true },
    })

    if (!connection) {
      cache.set(jid, { url: null, fetchedAt: now })
      return NextResponse.json({ success: true, url: null })
    }

    const session = getSession(connection.id)
    if (!session) {
      cache.set(jid, { url: null, fetchedAt: now })
      return NextResponse.json({ success: true, url: null })
    }

    const result = (await Promise.race([
      session.profilePictureUrl(jid, "preview").catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
    ])) ?? null

    cache.set(jid, { url: result, fetchedAt: Date.now() })
    return NextResponse.json({ success: true, url: result })
  } catch (error) {
    cache.set(jid, { url: null, fetchedAt: Date.now() })
    return NextResponse.json({ success: true, url: null })
  }
}
