import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/leads/export - Exportar leads em CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || ""
    const source = searchParams.get("source") || ""

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (source) where.source = source

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { name: true } },
        pipelineStage: { select: { name: true } },
      },
    })

    const headers = [
      "Nome",
      "E-mail",
      "Telefone",
      "WhatsApp",
      "Status",
      "Score",
      "Origem",
      "Empresa",
      "Cargo",
      "Orçamento (R$)",
      "Urgência",
      "Tags",
      "Notas",
      "Responsável",
      "Etapa Pipeline",
      "Criado em",
    ]

    const rows = leads.map((lead) => [
      lead.name,
      lead.email || "",
      lead.phone || "",
      lead.whatsappNumber || "",
      lead.status,
      lead.score.toString(),
      lead.source,
      lead.companyName || "",
      lead.position || "",
      lead.budgetCents ? (lead.budgetCents / 100).toFixed(2) : "",
      lead.urgency,
      (JSON.parse(lead.tags || "[]") as string[]).join("; "),
      (lead.notes || "").replace(/[\n\r]/g, " "),
      lead.assignedTo?.name || "",
      lead.pipelineStage?.name || "",
      lead.createdAt.toISOString().split("T")[0],
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((field) => `"${field.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    // BOM for UTF-8 compatibility with Excel
    const bom = "\uFEFF"

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Erro ao exportar leads:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao exportar" } },
      { status: 500 }
    )
  }
}
