import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios para storage")
  }
  _supabase = createClient(url, key)
  return _supabase
}

// ---- Buckets ----

const AVATARS_BUCKET = "avatars"
const MEDIA_BUCKET = "media"

/**
 * Garante que os buckets existam. Chamado na primeira vez que o storage é usado.
 * Os buckets são criados como públicos para facilitar acesso via URL direta.
 */
let _bucketsReady = false
async function ensureBuckets() {
  if (_bucketsReady) return
  const supabase = getSupabase()
  for (const bucket of [AVATARS_BUCKET, MEDIA_BUCKET]) {
    const { error } = await supabase.storage.getBucket(bucket)
    if (error) {
      await supabase.storage.createBucket(bucket, { public: true })
    }
  }
  _bucketsReady = true
}

// ---- Avatares ----

export async function uploadAvatar(userId: string, buffer: Buffer, extension: string): Promise<string> {
  await ensureBuckets()
  const supabase = getSupabase()
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"
  const filePath = `${userId}-${Date.now()}.${safeExt}`
  const mimeTypes: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  }

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(filePath, buffer, {
    contentType: mimeTypes[safeExt] || "image/png",
    upsert: true,
  })
  if (error) throw new Error(`Erro ao salvar avatar: ${error.message}`)

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function deleteAvatar(avatarUrl?: string | null) {
  if (!avatarUrl) return
  // Só deleta se for uma URL do Supabase Storage
  if (!avatarUrl.includes("/storage/v1/object/public/avatars/")) return
  const filePath = avatarUrl.split("/avatars/").pop()
  if (!filePath) return
  const supabase = getSupabase()
  await supabase.storage.from(AVATARS_BUCKET).remove([filePath])
}

// ---- Mídias WhatsApp ----

export interface UploadMediaParams {
  conversationId: string
  extension: string
  buffer: Buffer
  contentType?: string
  prefix?: string
}

export async function uploadMedia(params: UploadMediaParams): Promise<string> {
  await ensureBuckets()
  const supabase = getSupabase()
  const { conversationId, extension, buffer, contentType, prefix = "media" } = params
  const filePath = `${conversationId}/${prefix}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, buffer, {
    contentType: contentType || "application/octet-stream",
    upsert: false,
  })
  if (error) throw new Error(`Erro ao salvar mídia: ${error.message}`)

  return filePath
}

export async function uploadThumbnail(conversationId: string, buffer: Buffer, originalName: string): Promise<string> {
  await ensureBuckets()
  const supabase = getSupabase()
  const name = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_")
  const filePath = `${conversationId}/thumbs/${name}-${Date.now()}.jpg`

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, buffer, {
    contentType: "image/jpeg",
    upsert: false,
  })
  if (error) throw new Error(`Erro ao salvar thumbnail: ${error.message}`)

  return filePath
}

export async function getMediaBuffer(filePath: string): Promise<Buffer> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(filePath)
  if (error || !data) throw new Error(`Erro ao baixar mídia: ${error?.message || "sem dados"}`)
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export function getMediaPublicUrl(filePath: string): string {
  const supabase = getSupabase()
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export async function deleteMedia(filePath?: string | null) {
  if (!filePath) return
  const supabase = getSupabase()
  await supabase.storage.from(MEDIA_BUCKET).remove([filePath])
}
