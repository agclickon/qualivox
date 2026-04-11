import { NextRequest } from "next/server"
import { onMessageStatus, onNewMessage } from "@/lib/baileys-listener"
import { subscribeSSE } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

// GET /api/whatsapp/events - SSE endpoint para atualizações em tempo real (Baileys push)
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        try {
          const formatted = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(formatted))
        } catch { /* stream closed */ }
      }

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch { /* stream closed */ }
      }, 30000)

      // Subscribe to Baileys message events (instant push)
      const unsubMessage = onNewMessage((_event, data) => {
        sendEvent({ type: "new_messages", messages: [data] })
      })

      const unsubStatus = onMessageStatus((_event, data) => {
        sendEvent({ type: "message_status", ...data })
      })

      // Subscribe to connection events
      const unsubConnection = subscribeSSE((event, data) => {
        sendEvent({ type: event, ...(data as Record<string, unknown>) })
      })

      // Cleanup
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubMessage()
        unsubStatus()
        unsubConnection()
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
