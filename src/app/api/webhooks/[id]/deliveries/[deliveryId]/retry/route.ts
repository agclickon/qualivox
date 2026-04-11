import { NextRequest, NextResponse } from "next/server"
import { retryDelivery } from "@/lib/webhook-service"

// POST /api/webhooks/[id]/deliveries/[deliveryId]/retry — reenvio manual
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; deliveryId: string } }
) {
  try {
    await retryDelivery(params.deliveryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Erro ao reenviar" } },
      { status: 400 }
    )
  }
}
