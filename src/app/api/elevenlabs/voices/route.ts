import { NextRequest, NextResponse } from "next/server"
import { getElevenLabsKey, listVoices } from "@/lib/elevenlabs"

export async function GET(req: NextRequest) {
  try {
    // Aceita chave via query param (para validar antes de salvar) ou usa a salva
    const paramKey = req.nextUrl.searchParams.get("apiKey")
    const apiKey = paramKey || await getElevenLabsKey()

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key ElevenLabs não configurada" }, { status: 400 })
    }

    const voices = await listVoices(apiKey)
    return NextResponse.json({ success: true, data: { voices } })
  } catch (error: any) {
    console.error("[ElevenLabs] Erro ao listar vozes:", error)
    return NextResponse.json({ success: false, error: error.message || "Erro ao buscar vozes" }, { status: 500 })
  }
}
