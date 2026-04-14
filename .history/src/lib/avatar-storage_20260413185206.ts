const mimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export function saveAvatarFile(userId: string, buffer: Buffer, extension: string) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"
  const mime = mimeTypes[safeExt] || "image/png"
  const base64 = buffer.toString("base64")
  return `data:${mime};base64,${base64}`
}

export function deleteAvatarFile(relativePath?: string | null) {
  // Noop — avatares são armazenados como data URI no banco
}
