import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const prisma = new PrismaClient()
  
  try {
    const passwordHash = await hashPassword('suasenha123')
    
    const user = await prisma.user.upsert({
      where: { email: 'agclickon@gmail.com' },
      update: {},
      create: {
        id: 'user-agclickon',
        email: 'agclickon@gmail.com',
        passwordHash,
        name: 'Agência ClickOn',
        role: 'super_admin',
        phone: '(11) 99999-0000',
        emailVerified: true,
        isActive: true,
        companyName: 'Agência ClickOn',
      }
    })
    
    console.log('✅ Usuário criado:', user.email)
    console.log('   Senha: suasenha123')
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
