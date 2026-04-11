"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Camera, Trash2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth-store"
import { updateProfileSchema, changePasswordSchema, type UpdateProfileInput, type ChangePasswordInput } from "@/lib/validators"
import { getInitials } from "@/lib/utils"

export default function PerfilPage() {
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  })

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Selecione uma imagem (JPG, PNG ou WebP)." })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "A imagem deve ter no máximo 5MB." })
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
    toast({ title: "Foto selecionada!", description: "Clique em 'Salvar Alterações' para confirmar." })
  }

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    try {
      setIsUpdating(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: "Perfil atualizado!", description: "Seus dados foram salvos com sucesso." })
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o perfil." })
    } finally {
      setIsUpdating(false)
    }
  }

  const onChangePassword = async (_data: ChangePasswordInput) => {
    try {
      setIsChangingPassword(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." })
      passwordForm.reset()
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar a senha." })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-h3 font-bold" data-testid="heading-perfil">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <div className="relative group">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {user?.name ? getInitials(user.name) : "?"}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              data-testid="input-avatar-file"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card border shadow-sm hover:bg-accent transition-colors"
              data-testid="button-upload-avatar"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize mt-1">
              {user?.role?.replace("_", " ")}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ImageIcon className="h-3 w-3" /> Alterar foto
              </button>
              {avatarPreview && (
                <button
                  onClick={() => setAvatarPreview(null)}
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Atualize suas informações de contato</CardDescription>
        </CardHeader>
        <form onSubmit={profileForm.handleSubmit(onUpdateProfile)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                data-testid="input-profile-name"
                className={profileForm.formState.errors.name ? "border-destructive" : ""}
                {...profileForm.register("name")}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-profile-email"
                className={profileForm.formState.errors.email ? "border-destructive" : ""}
                {...profileForm.register("email")}
              />
              {profileForm.formState.errors.email && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                data-testid="input-profile-phone"
                {...profileForm.register("phone")}
              />
            </div>
            <Button type="submit" disabled={isUpdating} data-testid="button-save-profile">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  data-testid="input-current-password"
                  className={passwordForm.formState.errors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                  {...passwordForm.register("currentPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  data-testid="input-new-password"
                  className={passwordForm.formState.errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                  {...passwordForm.register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  data-testid="input-confirm-new-password"
                  className={passwordForm.formState.errors.confirmNewPassword ? "border-destructive pr-10" : "pr-10"}
                  {...passwordForm.register("confirmNewPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmNewPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isChangingPassword} data-testid="button-change-password">
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Senha
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
