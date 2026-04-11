import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/webhooks/[id]/deliveries — últimas 50 entregas do endpoint
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deliveries = await prisma.$queryRawUnsafe<{
    id: string; event: string; status: string; status_code: number | null
    attempt: number; created_at: string; response_body: string | null
  }[]>(
    `SELECT id, event, status, status_code, attempt, created_at, response_body
     FROM webhook_deliveries
     WHERE webhook_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    params.id
  ).catch(() => [])

  return NextResponse.json({ success: true, data: deliveries })
}
