import fs from "fs"
import path from "path"

const AVATAR_ROOT = path.join(process.cwd(), "public", "uploads", "avatars")

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function getAvatarRoot() {
  ensureDir(AVATAR_ROOT)
  return AVATAR_ROOT
}

export function saveAvatarFile(userId: string, buffer: Buffer, extension: string) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"
  const filename = `${userId}-${Date.now()}.${safeExt}`
  const fullPath = path.join(getAvatarRoot(), filename)
  fs.writeFileSync(fullPath, buffer)
  return `/uploads/avatars/${filename}`
}

export function deleteAvatarFile(relativePath?: string | null) {
  if (!relativePath) return
  if (!relativePath.startsWith("/uploads/avatars/")) return
  const fullPath = path.join(process.cwd(), "public", relativePath)
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true })
  }
}
