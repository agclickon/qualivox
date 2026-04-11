import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/jwt"

const publicPaths = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/api/auth", "/api/whatsapp/fetch-profile-pics", "/api/whatsapp/webhook"]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    const token = request.cookies.get("access_token")?.value
    if (token) {
      const payload = await verifyAccessToken(token)
      if (payload && (pathname === "/login" || pathname === "/cadastro")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
    return NextResponse.next()
  }

  const token = request.cookies.get("access_token")?.value
  if (!token) {
    // Tentar refresh antes de redirecionar
    const refreshToken = request.cookies.get("refresh_token")?.value
    if (refreshToken) {
      const refreshUrl = new URL("/api/auth/refresh", request.url)
      try {
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: { Cookie: `refresh_token=${refreshToken}` },
        })
        if (refreshRes.ok) {
          const response = NextResponse.redirect(request.url)
          refreshRes.headers.getSetCookie().forEach((cookie) => {
            response.headers.append("Set-Cookie", cookie)
          })
          return response
        }
      } catch {}
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const payload = await verifyAccessToken(token)
  if (!payload) {
    // Token expirado — tentar refresh
    const refreshToken = request.cookies.get("refresh_token")?.value
    if (refreshToken) {
      const refreshUrl = new URL("/api/auth/refresh", request.url)
      try {
        const refreshRes = await fetch(refreshUrl, {
          method: "POST",
          headers: { Cookie: `refresh_token=${refreshToken}` },
        })
        if (refreshRes.ok) {
          const response = NextResponse.redirect(request.url)
          refreshRes.headers.getSetCookie().forEach((cookie) => {
            response.headers.append("Set-Cookie", cookie)
          })
          return response
        }
      } catch {}
    }
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("access_token")
    return response
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-id", payload.userId)
  requestHeaders.set("x-user-email", payload.email)
  requestHeaders.set("x-user-role", payload.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
