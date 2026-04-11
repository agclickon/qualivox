export function formatJidFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length > 13) {
    return `${digits}@lid`
  }
  return `${digits}@s.whatsapp.net`
}
