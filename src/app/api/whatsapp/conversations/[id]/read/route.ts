import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/whatsapp/conversations/[id]/read - Mark conversation as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Reset unread count and mark messages as read
    await prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    })

    await prisma.message.updateMany({
      where: { conversationId: id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking conversation as read:", error)
    return NextResponse.json(
      { success: false, error: "Failed to mark as read" },
      { status: 500 }
    )
  }
}
