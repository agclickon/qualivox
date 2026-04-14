import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import "@/lib/jobs/follow-up-runner"

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_request)
  try {
    const followUp = await prisma.followUp.findUnique({ where: { id: params.id } })
    if (!followUp) {
      return NextResponse.json(
        { success: false, error: "Follow-up não encontrado" },
        { status: 404 },
      )
    }

    await prisma.followUp.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FollowUps][DELETE]", error)
    return NextResponse.json(
      { success: false, error: "Erro ao remover follow-up" },
      { status: 500 },
    )
  }
}
