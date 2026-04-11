import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// DELETE /api/lgpd/delete-data?leadId=xxx - Excluir todos os dados de um lead (Direito ao Esquecimento)
export async function DELETE(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId é obrigatório" } },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    // Registrar auditoria antes de excluir
    const userId = request.headers.get("x-user-id")
    await prisma.auditLog.create({
      data: {
        userId,
        action: "LGPD_DATA_DELETION",
        entity: "lead",
        entityId: leadId,
        oldData: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
        }),
      },
    })

    // Excluir todos os dados relacionados (cascade definido no Prisma)
    await prisma.lead.delete({ where: { id: leadId } })

    // Excluir consentimentos
    await prisma.lgpdConsent.deleteMany({ where: { leadId } })

    return NextResponse.json({
      success: true,
      data: { message: "Todos os dados do lead foram excluídos permanentemente" },
    })
  } catch (error) {
    console.error("Erro ao excluir dados LGPD:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
