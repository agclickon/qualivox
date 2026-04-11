import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; knowledgeId: string } }
) {
  const userRole = req.headers.get("x-user-role")
  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const file = await (prisma.agentKnowledge as any).findUnique({
      where: { id: params.knowledgeId },
    })

    if (!file || file.agentId !== params.id) {
      return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 })
    }

    await (prisma.agentKnowledge as any).delete({ where: { id: params.knowledgeId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Knowledge] DELETE error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; knowledgeId: string } }
) {
  try {
    const file = await (prisma.agentKnowledge as any).findUnique({
      where: { id: params.knowledgeId },
    })

    if (!file || file.agentId !== params.id) {
      return NextResponse.json({ success: false, error: "Arquivo não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { file } })
  } catch (error) {
    console.error("[Knowledge] GET single error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
