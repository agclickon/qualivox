"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Building2, Loader2, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

// Schema de validação
const companyRegisterSchema = z.object({
  companyName: z.string().min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
  cnpj: z.string().optional().refine((val) => {
    if (!val) return true
    const clean = val.replace(/[^\d]/g, "")
    return clean.length === 14
  }, "CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  adminName: z.string().min(2, "Nome do responsável deve ter pelo menos 2 caracteres"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, "Você deve aceitar os termos"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
})

type CompanyRegisterInput = z.infer<typeof companyRegisterSchema>

export default function RegistrarEmpresaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyRegisterInput>({
    resolver: zodResolver(companyRegisterSchema),
    defaultValues: {
      acceptTerms: false,
    },
  })

  const onSubmit = async (data: CompanyRegisterInput) => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          adminName: data.adminName,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || "Erro ao registrar empresa")
      }

      setIsSuccess(true)
      toast({
        title: "Empresa registrada!",
        description: "Você tem 14 dias de trial no plano Pro.",
      })

      // Redireciona para login após 2 segundos
      setTimeout(() => {
        router.push("/login")
      }, 2000)

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar empresa",
        description: error instanceof Error ? error.message : "Tente novamente",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
            Registro concluído!
          </CardTitle>
          <CardDescription className="text-base">
            Sua empresa foi registrada com sucesso no plano Pro.
            <br />
            <span className="font-medium text-primary">14 dias de trial gratuito.</span>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Redirecionando para o login...
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Ir para o login <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Registrar Empresa</CardTitle>
        <CardDescription>
          Crie sua conta e comece com 14 dias de trial grátis no plano Pro
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Razão Social / Nome da Empresa</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Minha Empresa LTDA"
              className={errors.companyName ? "border-destructive" : ""}
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <Input
              id="cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              className={errors.cnpj ? "border-destructive" : ""}
              {...register("cnpj")}
            />
            {errors.cnpj && (
              <p className="text-sm text-destructive">{errors.cnpj.message}</p>
            )}
          </div>

          {/* Dados do Responsável */}
          <div className="space-y-2">
            <Label htmlFor="adminName">Nome do Responsável</Label>
            <Input
              id="adminName"
              type="text"
              placeholder="Seu nome completo"
              className={errors.adminName ? "border-destructive" : ""}
              {...register("adminName")}
            />
            {errors.adminName && (
              <p className="text-sm text-destructive">{errors.adminName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail corporativo</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@empresa.com"
              className={errors.email ? "border-destructive" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              {...register("phone")}
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                className={errors.password ? "border-destructive pr-10" : "pr-10"}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a senha"
                className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Termos */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="acceptTerms"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1"
              {...register("acceptTerms")}
            />
            <Label htmlFor="acceptTerms" className="text-sm font-normal leading-tight">
              Aceito os{" "}
              <Link href="/termos" className="text-primary hover:underline" target="_blank">
                termos de uso
              </Link>{" "}
              e{" "}
              <Link href="/privacidade" className="text-primary hover:underline" target="_blank">
                política de privacidade
              </Link>
            </Label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
          )}

          {/* Info do Plano */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Plano Pro — Trial 14 dias</p>
            <ul className="text-muted-foreground space-y-0.5">
              <li>• Até 500 leads</li>
              <li>• Até 10 usuários</li>
              <li>• 3 conexões WhatsApp</li>
              <li>• 5 agentes IA</li>
              <li>• Webhooks e API access</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="mr-2 h-4 w-4" />
            )}
            Criar minha empresa
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
