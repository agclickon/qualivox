import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"

async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  if (!token) return null
  try {
    const payload = await verifyAccessToken(token)
    if (!payload) return null
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, role: true, isActive: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch (error) {
    console.error("[templates] Erro ao autenticar:", error)
    return null
  }
}

// GET /api/templates - Listar templates de mensagem
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || ""

    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { isGlobal: true },
        { createdById: authUser.id },
      ],
    }
    if (category) where.category = category

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: { templates } })
  } catch (error) {
    console.error("Erro ao listar templates:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// POST /api/templates - Criar template
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, content, variables, category, scope } = body

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name e content são obrigatórios" } },
        { status: 400 }
      )
    }

    const wantsGlobal = scope === "global"
    if (wantsGlobal && authUser.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Apenas super admins podem criar templates globais" } },
        { status: 403 }
      )
    }

    let normalizedVariables: string
    if (typeof variables === "string") normalizedVariables = variables
    else if (Array.isArray(variables)) normalizedVariables = JSON.stringify(variables)
    else normalizedVariables = JSON.stringify([])

    const isGlobal = wantsGlobal

    const template = await prisma.messageTemplate.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        variables: normalizedVariables,
        category: category || null,
        isGlobal,
        createdById: isGlobal ? null : authUser.id,
      },
    })

    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar template:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
