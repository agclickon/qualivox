import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/leads/import - Importar leads via CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Nenhum arquivo enviado" } },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Arquivo CSV vazio ou sem dados" } },
        { status: 400 }
      )
    }

    // Pular header
    const dataLines = lines.slice(1)
    const userId = request.headers.get("x-user-id")

    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { isDefault: true },
      orderBy: { order: "asc" },
    })

    let imported = 0
    let errors = 0

    for (const line of dataLines) {
      try {
        // Parse CSV simples (considerando aspas)
        const fields = parseCSVLine(line)

        if (!fields[0] || fields[0].trim() === "") continue

        await prisma.lead.create({
          data: {
            name: fields[0]?.trim() || "Sem nome",
            email: fields[1]?.trim() || null,
            phone: fields[2]?.trim() || null,
            whatsappNumber: fields[3]?.trim() || null,
            source: (validateSource(fields[6]?.trim()) || "outro") as "whatsapp" | "website" | "indicacao" | "telefone" | "email" | "rede_social" | "evento" | "outro",
            companyName: fields[7]?.trim() || null,
            position: fields[8]?.trim() || null,
            notes: fields[12]?.trim() || null,
            tags: JSON.stringify(fields[11] ? fields[11].split(";").map((t: string) => t.trim()).filter(Boolean) : []),
            createdById: userId || null,
            pipelineStageId: defaultStage?.id || null,
          },
        })
        imported++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        errors,
        total: dataLines.length,
      },
    })
  } catch (error) {
    console.error("Erro ao importar leads:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao importar" } },
      { status: 500 }
    )
  }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current)
      current = ""
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

function validateSource(source: string | undefined): string | null {
  const validSources = ["whatsapp", "website", "indicacao", "telefone", "email", "rede_social", "evento", "outro"]
  if (source && validSources.includes(source.toLowerCase())) {
    return source.toLowerCase()
  }
  return null
}
