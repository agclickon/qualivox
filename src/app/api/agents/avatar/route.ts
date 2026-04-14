import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  const userRole = req.headers.get("x-user-role")
  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const agentId = formData.get("agentId") as string | null

    if (!file || !agentId) {
      return NextResponse.json({ success: false, error: "Arquivo e agentId são obrigatórios" }, { status: 400 })
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "Imagem muito grande. Máximo: 2MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return NextResponse.json({ success: false, error: "Formato inválido. Use JPG, PNG ou WebP" }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "agents")
    await mkdir(uploadDir, { recursive: true })

    const fileName = `agent-${agentId}-${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const avatarUrl = `/uploads/agents/${fileName}`

    // Usa SQL raw para evitar conflito com Prisma client desatualizado em memória
    await prisma.$executeRaw`UPDATE agents SET avatar_url = ${avatarUrl}, updated_at = datetime('now') WHERE id = ${agentId}`

    return NextResponse.json({ success: true, data: { avatarUrl } })
  } catch (error) {
    console.error("[AgentAvatar] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
