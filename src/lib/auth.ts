import bcrypt from "bcryptjs"

// Re-exportar funções JWT do jwt.ts para manter compatibilidade com API routes
export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/jwt"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("A senha deve ter no mínimo 8 caracteres")
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número")
  }

  return { valid: errors.length === 0, errors }
}
