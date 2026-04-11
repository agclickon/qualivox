import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import "@/lib/jobs/follow-up-runner"

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
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
