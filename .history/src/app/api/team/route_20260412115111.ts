import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { hashPassword } from "@/lib/auth"

// GET /api/team - Listar membros da equipe
export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: { users } })
  } catch (error) {
    console.error("Erro ao listar equipe:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/team - Criar novo membro
export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()
    const { name, email, password, phone, role } = body

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Nome, email e senha são obrigatórios" } },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Senha deve ter no mínimo 6 caracteres" } },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Já existe um usuário com este email" } },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        passwordHash: hashedPassword,
        role: role === "admin" ? "admin" : "user",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, data: { user } }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar membro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
