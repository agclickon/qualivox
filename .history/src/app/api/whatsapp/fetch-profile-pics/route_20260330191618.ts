import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"

// POST /api/whatsapp/fetch-profile-pics - Buscar fotos de perfil dos leads
export async function POST() {
  try {
    // Buscar conexão padrão
    const connection = await prisma.whatsappConnection.findFirst({
      where: { isDefault: true },
    })

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: "Nenhuma conexão WhatsApp encontrada",
      })
    }

    const session = getSession(connection.id)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: "Sessão WhatsApp não está ativa",
      })
    }

    // Buscar leads sem foto de perfil
    const leads = await prisma.lead.findMany({
      where: {
        profilePicUrl: null,
        whatsappNumber: { not: null },
      },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
      },
    })

    console.log(`[Profile Pics] Buscando fotos para ${leads.length} leads`)

    const results: { name: string; status: string; url?: string }[] = []

    for (const lead of leads) {
      // Tentar ambos os formatos de JID
      const jidsToTry = [
        `${lead.whatsappNumber}@s.whatsapp.net`,
        `${lead.whatsappNumber}@lid`,
      ]
      console.log(`[Profile Pics] Buscando foto para ${lead.name}`)

      try {
        let url: string | null = null
        
        for (const jid of jidsToTry) {
          if (url) break
          console.log(`[Profile Pics] Tentando ${jid}`)
          
          const result = await Promise.race([
            session.profilePictureUrl(jid, "preview").catch((err: any) => {
              console.log(`[Profile Pics] Erro para ${jid}:`, err?.message)
              return null
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ])
          url = result ?? null
        }

        if (url) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { profilePicUrl: url },
          })
          results.push({ name: lead.name, status: "success", url: url.substring(0, 50) + "..." })
          console.log(`[Profile Pics] ✓ Foto salva para ${lead.name}`)
        } else {
          results.push({ name: lead.name, status: "no_photo" })
          console.log(`[Profile Pics] Sem foto para ${lead.name}`)
        }
      } catch (err: any) {
        results.push({ name: lead.name, status: "error" })
        console.error(`[Profile Pics] Erro para ${lead.name}:`, err?.message)
      }

      // Aguardar um pouco entre cada busca para não sobrecarregar
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      success: true,
      data: {
        total: leads.length,
        results,
      },
    })
  } catch (error: any) {
    console.error("[Profile Pics] Erro:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Erro interno" },
      { status: 500 }
    )
  }
}
