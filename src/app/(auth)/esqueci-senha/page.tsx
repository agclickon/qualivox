"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators"

export default function EsqueciSenhaPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsLoading(true)
      // TODO: Integrar com API de recuperação de senha
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setEmailSent(true)
      toast({
        title: "E-mail enviado!",
        description: `Um link de recuperação foi enviado para ${data.email}`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar o e-mail. Tente novamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">E-mail enviado!</CardTitle>
          <CardDescription>
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full" data-testid="button-back-login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe seu e-mail e enviaremos um link para redefinir sua senha
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-send-email"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Enviar link de recuperação
          </Button>
          <Link
            href="/login"
            className="text-sm text-primary hover:underline"
            data-testid="link-back-login"
          >
            <ArrowLeft className="inline mr-1 h-3 w-3" />
            Voltar para o login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
