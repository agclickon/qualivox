/**
 * Retorna a URL base da aplicação
 * Prioridade: env var → config do tenant → localhost (fallback)
 */
export function getAppUrl(): string {
  // 1. Variáveis de ambiente (produção/Vercel)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 2. Fallback para desenvolvimento
  return "http://localhost:3000"
}
