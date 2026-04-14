import { uploadAvatar, deleteAvatar } from "@/lib/supabase-storage"

export async function saveAvatarFile(userId: string, buffer: Buffer, extension: string): Promise<string> {
  return uploadAvatar(userId, buffer, extension)
}

export async function deleteAvatarFile(relativePath?: string | null) {
  return deleteAvatar(relativePath)
}
