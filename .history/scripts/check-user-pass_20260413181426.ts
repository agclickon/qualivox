import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "agclickon@gmail.com" },
    select: { id: true, email: true, password: true, role: true, isActive: true }
  })
  
  if (!user) {
    console.log("User not found!")
    return
  }
  
  console.log("User:", user.email, "| role:", user.role, "| active:", user.isActive)
  console.log("Password hash:", user.password?.substring(0, 20) + "...")
  console.log("Hash length:", user.password?.length)
  
  // Testa senhas comuns
  const passwords = ["admin123", "Clickon@2025", "clickon123", "123456"]
  for (const pwd of passwords) {
    const match = await bcrypt.compare(pwd, user.password)
    console.log(`  "${pwd}" => ${match ? "✅ MATCH!" : "❌ no match"}`)
  }
  
  await prisma.$disconnect()
}

main()
