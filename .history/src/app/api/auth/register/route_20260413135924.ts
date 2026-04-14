import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"
import { registerSchema } from "@/lib/validators"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Dados de entrada inválidos",
            details: validation.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        },
        { status: 400 }
      )
    }

    const { name, email, phone, password, companyName, cnpj, responsibleName } = validation.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Este e-mail já está cadastrado",
          },
        },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma.user.create as any)({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        role: "admin",
        companyName: companyName || null,
        cnpj: cnpj || null,
        responsibleName: responsibleName || null,
        isActive: false,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Conta criada com sucesso! Aguarde a aprovação do administrador para acessar o sistema.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            companyName: user.companyName,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro no cadastro:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erro interno do servidor",
        },
      },
      { status: 500 }
    )
  }
}
