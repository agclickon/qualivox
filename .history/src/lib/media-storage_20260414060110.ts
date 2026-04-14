import {
  uploadMedia,
  uploadThumbnail,
  getMediaBuffer,
  getMediaPublicUrl,
  deleteMedia as deleteMediaFromStorage,
} from "@/lib/supabase-storage"

export type SaveMediaParams = {
  conversationId: string
  extension: string
  buffer: Buffer
  contentType?: string
  prefix?: string
}

export type SaveThumbParams = {
  conversationId: string
  buffer: Buffer
  originalName: string
}

export async function saveMedia(params: SaveMediaParams): Promise<string> {
  return uploadMedia(params)
}

export async function saveThumbnail(params: SaveThumbParams): Promise<string> {
  return uploadThumbnail(params.conversationId, params.buffer, params.originalName)
}

export async function deleteMedia(relativePath?: string | null) {
  return deleteMediaFromStorage(relativePath)
}

export async function getMediaFileBuffer(relativePath: string): Promise<Buffer> {
  return getMediaBuffer(relativePath)
}

export function getPublicMediaUrl(relativePath: string): string {
  return getMediaPublicUrl(relativePath)
}
