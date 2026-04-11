import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken, comparePassword, hashPassword } from "@/lib/auth"
import { changePasswordSchema } from "@/lib/validators"

async function authenticate(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  if (!token) return null
  try {
    const payload = await verifyAccessToken(token)
    if (!payload) return null
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch (error) {
    console.error("[profile/password] erro ao autenticar", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticate(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message || "Dados inválidos" } },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { passwordHash: true } })
    if (!user?.passwordHash) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Usuário não encontrado" } },
        { status: 404 }
      )
    }

    const matches = await comparePassword(currentPassword, user.passwordHash)
    if (!matches) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "Senha atual incorreta" } },
        { status: 400 }
      )
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: authUser.id }, data: { passwordHash: newHash } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[profile/password] erro ao trocar senha", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
