import { getSession } from "./session"

export async function sendMessage(
  connectionId: string,
  phone: string,
  message: string,
  options?: { media?: Buffer; caption?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const sock = await getSession(connectionId)
  if (!sock) {
    return { success: false, error: "Session not connected" }
  }

  try {
    const jid = phone.includes("@") ? phone : `${phone.replace(/\D/g, "")}@s.whatsapp.net`
    
    let result: any
    
    if (options?.media) {
      result = await sock.sendMessage(jid, {
        image: options.media,
        caption: options.caption || message,
      })
    } else {
      result = await sock.sendMessage(jid, { text: message })
    }

    return { success: true, id: result?.key?.id }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
