import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(1, "Senha obrigatoria"),
})

export const clientSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  phone: z
    .string()
    .min(10, "Telefone invalido")
    .max(15, "Telefone invalido"),
  email: z.string().email("E-mail invalido").or(z.literal("")).optional().default(""),
  notes: z.string().max(500, "Observacoes muito longas").optional().default(""),
})

export const serviceSchema = z.object({
  client_id: z.string().uuid("Cliente invalido"),
  service_date: z.string().min(1, "Data obrigatoria"),
  description: z
    .string()
    .min(2, "Descricao deve ter pelo menos 2 caracteres")
    .max(200, "Descricao muito longa"),
  amount: z
    .number({ invalid_type_error: "Valor invalido" })
    .min(0, "Valor deve ser positivo")
    .max(99999.99, "Valor muito alto"),
  notes: z.string().max(500, "Observacoes muito longas").optional().default(""),
})

export const tenantSettingsSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").max(100, "Nome muito longo"),
  logo_url: z.string().url("URL invalida").or(z.literal("")).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor invalida")
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor invalida")
    .optional(),
  contact_phone: z.string().max(20).optional().default(""),
  contact_email: z.string().email("E-mail invalido").or(z.literal("")).optional(),
  theme_mode: z.enum(["light", "dark", "system"]).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type ServiceInput = z.infer<typeof serviceSchema>
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>
