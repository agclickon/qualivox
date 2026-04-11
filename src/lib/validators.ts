import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
  password: z
    .string()
    .min(1, "Senha é obrigatória"),
})

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(255, "Nome muito longo"),
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
  phone: z
    .string()
    .min(10, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmPassword: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "Você deve aceitar os termos de uso"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
})

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmPassword: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(255, "Nome muito longo"),
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
  phone: z
    .string()
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
})

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  confirmNewPassword: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "As senhas não coincidem",
  path: ["confirmNewPassword"],
})

export const createLeadSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z
    .string()
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  source: z.enum([
    "whatsapp", "website", "indicacao", "telefone",
    "email", "rede_social", "evento", "outro",
  ]).default("whatsapp"),
  companyName: z.string().optional().or(z.literal("")),
  position: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
