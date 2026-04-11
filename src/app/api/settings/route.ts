import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/settings - Buscar todas as configurações
export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return NextResponse.json({ success: true, data: map })
  } catch (error) {
    console.error("Erro ao buscar configurações:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}

// PUT /api/settings - Salvar configurações (recebe objeto chave-valor)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Body deve ser um objeto chave-valor" } },
        { status: 400 }
      )
    }

    const entries = Object.entries(body) as [string, string][]

    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

    return NextResponse.json({ success: true, data: { updated: entries.length } })
  } catch (error) {
    console.error("Erro ao salvar configurações:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
