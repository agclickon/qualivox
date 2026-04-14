import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as defaultPrisma } from "@/lib/prisma"
import { verifyAccessToken } from "@/lib/auth"
import { updateProfileSchema } from "@/lib/validators"
import { saveAvatarFile, deleteAvatarFile } from "@/lib/avatar-storage"

async function authenticate(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value
  if (!token) return null
  try {
    const payload = await verifyAccessToken(token)
    if (!payload) return null
    const user = await defaultPrisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    })
    if (!user || !user.isActive) return null
    return user
  } catch (error) {
    console.error("[profile] Erro ao autenticar:", error)
    return null
  }
}

function buildErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code: "VALIDATION_ERROR", message } },
    { status }
  )
}

export async function PATCH(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const authUser = await authenticate(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
    })
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Usuário não encontrado" } },
        { status: 404 }
      )
    }

    const contentType = request.headers.get("content-type") || ""
    let incomingName: string | null = null
    let incomingEmail: string | null = null
    let incomingPhone: string | null = null
    let removeAvatar = false
    let avatarFile: File | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      incomingName = (formData.get("name") as string | null) ?? null
      incomingEmail = (formData.get("email") as string | null) ?? null
      incomingPhone = (formData.get("phone") as string | null) ?? null
      const removeAvatarValue = formData.get("removeAvatar")
      removeAvatar = removeAvatarValue === "true" || removeAvatarValue === "1"
      const avatar = formData.get("avatar")
      if (avatar instanceof File && avatar.size > 0) {
        avatarFile = avatar
      }
    } else {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>
      incomingName = typeof body.name === "string" ? body.name : null
      incomingEmail = typeof body.email === "string" ? body.email : null
      incomingPhone = typeof body.phone === "string" ? body.phone : null
      removeAvatar = Boolean(body.removeAvatar)
    }

    const parsed = updateProfileSchema.safeParse({
      name: (incomingName ?? currentUser.name ?? "").trim(),
      email: (incomingEmail ?? currentUser.email ?? "").trim(),
      phone: (incomingPhone ?? currentUser.phone ?? "") || "",
    })

    if (!parsed.success) {
      return buildErrorResponse(parsed.error.errors[0]?.message || "Dados inválidos")
    }

    const { name, email, phone } = parsed.data

    const emailAlreadyUsed = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: authUser.id },
      },
    })

    if (emailAlreadyUsed) {
      return buildErrorResponse("Este e-mail já está em uso", 409)
    }

    let newAvatarUrl: string | null | undefined = undefined

    if (avatarFile) {
      if (avatarFile.size > 5 * 1024 * 1024) {
        return buildErrorResponse("Imagem deve ter no máximo 5MB")
      }
      const allowedTypes: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/webp": "webp",
      }
      const extension = allowedTypes[avatarFile.type]
      if (!extension) {
        return buildErrorResponse("Formato de imagem não suportado")
      }
      const buffer = Buffer.from(await avatarFile.arrayBuffer())
      newAvatarUrl = saveAvatarFile(authUser.id, buffer, extension)
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        name,
        email,
        phone: phone ? phone : null,
        ...(typeof newAvatarUrl !== "undefined"
          ? { avatarUrl: newAvatarUrl }
          : removeAvatar
            ? { avatarUrl: null }
            : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
      },
    })

    if (typeof newAvatarUrl !== "undefined" && currentUser.avatarUrl) {
      deleteAvatarFile(currentUser.avatarUrl)
    } else if (removeAvatar && currentUser.avatarUrl) {
      deleteAvatarFile(currentUser.avatarUrl)
    }

    return NextResponse.json({ success: true, data: { user: updatedUser } })
  } catch (error) {
    console.error("[profile] Erro ao atualizar perfil:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
