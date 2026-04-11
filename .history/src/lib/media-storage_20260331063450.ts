import fs from "fs"
import path from "path"

const MEDIA_ROOT = process.env.WHATSAPP_MEDIA_DIR || path.join(process.cwd(), "public", "uploads", "whatsapp")
const THUMBS_FOLDER = "thumbs"

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export type SaveMediaParams = {
  conversationId: string
  extension: string
  buffer: Buffer
  prefix?: string
}

export type SaveThumbParams = {
  conversationId: string
  buffer: Buffer
  originalName: string
}

export function getMediaRoot() {
  ensureDir(MEDIA_ROOT)
  return MEDIA_ROOT
}

export function resolveMediaPath(relativePath: string) {
  const fullPath = path.join(getMediaRoot(), relativePath)
  if (!fullPath.startsWith(getMediaRoot())) {
    throw new Error("Invalid media path")
  }
  return fullPath
}

export function saveMedia({ conversationId, extension, buffer, prefix = "media" }: SaveMediaParams) {
  const convoDir = path.join(getMediaRoot(), conversationId)
  ensureDir(convoDir)
  const filename = `${prefix}-${Date.now()}.${extension}`
  const fullPath = path.join(convoDir, filename)
  fs.writeFileSync(fullPath, buffer)
  return path.relative(getMediaRoot(), fullPath).replace(/\\/g, "/")
}

export function saveThumbnail({ conversationId, buffer, originalName }: SaveThumbParams) {
  const convoDir = path.join(getMediaRoot(), conversationId, THUMBS_FOLDER)
  ensureDir(convoDir)
  const filename = `${path.parse(originalName).name}-thumb-${Date.now()}.jpg`
  const fullPath = path.join(convoDir, filename)
  fs.writeFileSync(fullPath, buffer)
  return path.relative(getMediaRoot(), fullPath).replace(/\\/g, "/")
}

export function deleteMedia(relativePath?: string | null) {
  if (!relativePath) return
  const fullPath = resolveMediaPath(relativePath)
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true })
  }
}

export function createMediaReadStream(relativePath: string, options?: fs.ReadStreamOptions) {
  const fullPath = resolveMediaPath(relativePath)
  return fs.createReadStream(fullPath, options)
}

export function getMediaStat(relativePath: string) {
  const fullPath = resolveMediaPath(relativePath)
  return fs.statSync(fullPath)
}
