import { SignJWT, jwtVerify } from "jose"
import type { JwtPayload, UserRole } from "@/types"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-me"
)
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-change-me"
)

const ACCESS_TOKEN_EXPIRY = "8h"
const REFRESH_TOKEN_EXPIRY = "7d"

export async function generateAccessToken(payload: {
  userId: string
  email: string
  role: UserRole
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function generateRefreshToken(payload: {
  userId: string
  email: string
  role: UserRole
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET)
}

export async function verifyAccessToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}
