import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, generateRefreshToken } from "@/lib/auth"
import type { UserRole } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const oldRefreshToken = request.cookies.get("refresh_token")?.value

    if (!oldRefreshToken) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Refresh token ausente" } },
        { status: 401 }
      )
    }

    const payload = await verifyRefreshToken(oldRefreshToken)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Refresh token inválido" } },
        { status: 401 }
      )
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Refresh token expirado" } },
        { status: 401 }
      )
    }

    // Remover token antigo
    await prisma.refreshToken.delete({ where: { id: storedToken.id } })

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "USER_INACTIVE", message: "Usuário inativo" } },
        { status: 403 }
      )
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    }

    const newAccessToken = await generateAccessToken(tokenPayload)
    const newRefreshToken = await generateRefreshToken(tokenPayload)

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = NextResponse.json({ success: true })

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 horas — igual ao JWT_EXPIRY
      path: "/",
    })

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Erro ao renovar token:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
