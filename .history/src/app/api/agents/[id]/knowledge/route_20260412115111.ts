import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { extractText, chunkText } from "@/lib/text-extractor"
import { generateEmbeddings } from "@/lib/embeddings"

const ALLOWED_TYPES = ["txt", "md", "pdf", "docx"]
const MAX_SIZE_MB = 10

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const { searchParams } = new URL(req.url)
    const sourceType = searchParams.get("sourceType") // "file" | "conversation" | null
    const reviewStatus = searchParams.get("reviewStatus") // "pending" | "approved" | "rejected" | null

    // Usa raw SQL para suportar campos novos (source_type, review_status)
    let query = `SELECT id, agent_id, file_name, file_type, file_size, status, chunk_count, error_msg, source_type, conv_source, review_status, created_at, updated_at FROM agent_knowledge WHERE agent_id = ?`
    const values: unknown[] = [params.id]

    if (sourceType) {
      query += ` AND source_type = ?`
      values.push(sourceType)
    }
    if (reviewStatus) {
      query += ` AND review_status = ?`
      values.push(reviewStatus)
    }
    query += ` ORDER BY created_at DESC`

    const rawFiles = await prisma.$queryRawUnsafe<any[]>(query, ...values)

    // Normaliza nomes de campo para camelCase
    const files = rawFiles.map((f) => ({
      id: f.id,
      agentId: f.agent_id,
      fileName: f.file_name,
      fileType: f.file_type,
      fileSize: f.file_size,
      status: f.status,
      chunkCount: f.chunk_count,
      errorMsg: f.error_msg,
      sourceType: f.source_type ?? "file",
      convSource: f.conv_source ?? null,
      reviewStatus: f.review_status ?? "approved",
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    }))

    return NextResponse.json({ success: true, data: { files } })
  } catch (error) {
    console.error("[Knowledge] GET error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  const userRole = req.headers.get("x-user-role")
  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    // Verifica se o agente existe
    const agent = await prisma.agent.findUnique({ where: { id: params.id } })
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agente não encontrado" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "Arquivo não enviado" }, { status: 400 })
    }

    // Valida tamanho
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB` },
        { status: 400 }
      )
    }

    // Valida tipo
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_TYPES.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Tipo não suportado. Use: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    // Cria registro com status "processing"
    const knowledge = await (prisma.agentKnowledge as any).create({
      data: {
        agentId: params.id,
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        status: "processing",
        content: "",
        chunkCount: 0,
      },
    })

    // Processa em background (sem bloquear a resposta)
    processFile(knowledge.id, file).catch((err) => {
      console.error(`[Knowledge] Erro ao processar arquivo ${knowledge.id}:`, err)
    })

    return NextResponse.json({ success: true, data: { file: knowledge } }, { status: 201 })
  } catch (error) {
    console.error("[Knowledge] POST error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}

async function processFile(knowledgeId: string, file: File) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop()?.toLowerCase() || ""

    // 1. Extrai texto e divide em chunks
    const text = await extractText(buffer, ext)
    const chunks = chunkText(text)

    // 2. Busca o agentId para associar os chunks
    const knowledge = await (prisma.agentKnowledge as any).findUnique({
      where: { id: knowledgeId },
      select: { agentId: true },
    })
    const agentId: string = knowledge?.agentId ?? ""

    // 3. Gera embeddings em lotes de 50 (evita timeout de API)
    const BATCH_SIZE = 50
    const allEmbeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchEmbeddings = await generateEmbeddings(batch)
      allEmbeddings.push(...batchEmbeddings)
    }

    // 4. Apaga chunks anteriores deste arquivo (re-indexação)
    await (prisma.agentKnowledgeChunk as any).deleteMany({ where: { knowledgeId } })

    // 5. Salva os chunks com embeddings
    if (agentId && chunks.length > 0) {
      await (prisma.agentKnowledgeChunk as any).createMany({
        data: chunks.map((chunkText, index) => ({
          knowledgeId,
          agentId,
          chunkIndex: index,
          text: chunkText,
          embedding: JSON.stringify(allEmbeddings[index] || []),
        })),
      })
    }

    // 6. Marca como indexado
    await (prisma.agentKnowledge as any).update({
      where: { id: knowledgeId },
      data: {
        content: text,
        chunkCount: chunks.length,
        status: "indexed",
        errorMsg: null,
      },
    })

    console.log(`[Knowledge] Arquivo ${knowledgeId} indexado: ${chunks.length} chunks, embeddings=${allEmbeddings[0]?.length > 0 ? "✓" : "keyword-only"}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    await (prisma.agentKnowledge as any).update({
      where: { id: knowledgeId },
      data: { status: "error", errorMsg: message },
    }).catch(() => {})
  }
}
