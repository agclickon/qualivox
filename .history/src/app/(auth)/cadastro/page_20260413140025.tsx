"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, UserPlus, Loader2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth-store"
import { registerSchema, type RegisterInput } from "@/lib/validators"

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
}

export default function CadastroPage() {
  const router = useRouter()
  const { toast } = useToast()
  const registerUser = useAuthStore((state) => state.register)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true)
      await registerUser(data)
      toast({
        title: "Conta criada com sucesso!",
        description: "Aguarde a aprovação do administrador para acessar o sistema.",
      })
      router.push("/login")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error instanceof Error ? error.message : "Tente novamente",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img
            src="/logo/logo-qualivox-white.png"
            alt="Qualivox"
            className="h-12 w-auto dark:hidden"
          />
          <img
            src="/logo/logo-qualivox-black.png"
            alt="Qualivox"
            className="h-12 w-auto hidden dark:block"
          />
        </div>
        <CardDescription>
          Preencha os dados da empresa e do responsável
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Dados da Empresa */}
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-1">
            <Building2 className="h-4 w-4" />
            Dados da Empresa
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Nome da sua empresa"
              className={errors.companyName ? "border-destructive" : ""}
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              className={errors.cnpj ? "border-destructive" : ""}
              {...register("cnpj")}
              onChange={(e) => {
                const formatted = formatCNPJ(e.target.value)
                setValue("cnpj", formatted, { shouldValidate: true })
              }}
            />
            {errors.cnpj && (
              <p className="text-sm text-destructive">{errors.cnpj.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsibleName">Nome do responsável</Label>
            <Input
              id="responsibleName"
              type="text"
              placeholder="Nome completo do responsável"
              className={errors.responsibleName ? "border-destructive" : ""}
              {...register("responsibleName")}
            />
            {errors.responsibleName && (
              <p className="text-sm text-destructive">{errors.responsibleName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              data-testid="input-phone"
              className={errors.phone ? "border-destructive" : ""}
              {...register("phone")}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value)
                setValue("phone", formatted, { shouldValidate: true })
              }}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Separador */}
          <div className="border-t border-border my-2" />

          {/* Dados de Acesso */}
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-1">
            <UserPlus className="h-4 w-4" />
            Dados de Acesso
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Seu nome completo"
              data-testid="input-name"
              className={errors.name ? "border-destructive" : ""}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              data-testid="input-email"
              className={errors.email ? "border-destructive" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                data-testid="input-password"
                className={errors.password ? "border-destructive pr-10" : "pr-10"}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="toggle-password"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a senha"
                data-testid="input-confirm-password"
                className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="toggle-confirm-password"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="acceptTerms"
              data-testid="checkbox-terms"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              {...register("acceptTerms")}
            />
            <Label htmlFor="acceptTerms" className="text-sm font-normal">
              Aceito os termos de uso e política de privacidade
            </Label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-register"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Criar conta
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
              data-testid="link-login"
            >
              Faça login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
