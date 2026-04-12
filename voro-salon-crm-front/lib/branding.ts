import { EstablishmentType } from "@/types/Enums/establishmentType.enum"

export interface BrandingConfig {
  productName: string
  shortName: string
  establishmentLabel: string
  establishmentLabelPlural: string
  description: string
  hostname?: string
}

const BRANDING_MAP: Record<EstablishmentType, BrandingConfig> = {
  [EstablishmentType.Salon]: {
    productName: "Voro Salon",
    shortName: "Voro Salon",
    establishmentLabel: "salão",
    establishmentLabelPlural: "salões",
    description: "Sistema para salão de beleza com agendamento online e WhatsApp integrado. Controle financeiro, gestão de clientes e relatórios. Teste grátis 14 dias.",
    hostname: "salon-crm.vorolabs.app"
  },
  [EstablishmentType.Barber]: {
    productName: "Voro Barber",
    shortName: "Voro Barber",
    establishmentLabel: "barbearia",
    establishmentLabelPlural: "barbearias",
    description: "Sistema para barbearia com agendamento online e WhatsApp Bot integrado. Controle financeiro, gestão de clientes e comissões. Teste grátis 14 dias.",
    hostname: "barber-crm.vorolabs.app"
  },
  [EstablishmentType.NailsLashes]: {
    productName: "Voro Nails",
    shortName: "Voro Nails",
    establishmentLabel: "nails & cílios",
    establishmentLabelPlural: "nails & cílios",
    description: "Sistema para studio de unhas e cílios com agendamento online e WhatsApp integrado. Controle financeiro, histórico de clientes e comissões. Teste grátis 14 dias.",
    hostname: "nails-crm.vorolabs.app"
  },
  [EstablishmentType.EstheticsClinic]: {
    productName: "Voro Estética",
    shortName: "Voro Estética",
    establishmentLabel: "estética & clínica",
    establishmentLabelPlural: "estética & clínica",
    description: "Sistema para clínica de estética com agendamento online, anamnese digital e WhatsApp integrado. Controle financeiro e prontuário. Teste grátis 14 dias.",
    hostname: "esthetic-crm.vorolabs.app"
  },
  [EstablishmentType.SpaMassage]: {
    productName: "Voro SPA",
    shortName: "Voro SPA",
    establishmentLabel: "spa & massagem",
    establishmentLabelPlural: "spas & massagem",
    description: "Sistema para SPA e massagem com agendamento online e WhatsApp integrado. Gestão de salas, controle financeiro e pacotes de bem-estar. Teste grátis 14 dias.",
    hostname: "spa-crm.vorolabs.app"
  },
}

const HOSTNAME_MAP: Record<string, EstablishmentType> = {
  "salon-crm.vorolabs.app": EstablishmentType.Salon,
  "barber-crm.vorolabs.app": EstablishmentType.Barber,
  "nails-crm.vorolabs.app": EstablishmentType.NailsLashes,
  "esthetic-crm.vorolabs.app": EstablishmentType.EstheticsClinic,
  "spa-crm.vorolabs.app": EstablishmentType.SpaMassage,
}

export function getBrandingByType(type: EstablishmentType): BrandingConfig {
  return BRANDING_MAP[type] ?? BRANDING_MAP[EstablishmentType.Salon]
}

export function getBrandingByHostname(hostname: string): BrandingConfig {
  const type = HOSTNAME_MAP[hostname] ?? EstablishmentType.Salon
  return BRANDING_MAP[type]
}

export function getEstablishmentTypeByHostname(hostname: string): EstablishmentType {
  return HOSTNAME_MAP[hostname] ?? EstablishmentType.Salon
}

/** Use no cliente (browser) — lê o hostname atual */
export function getClientBranding(): BrandingConfig {
  if (typeof window === "undefined") return BRANDING_MAP[EstablishmentType.Salon]
  return getBrandingByHostname(window.location.hostname)
}

const SERVICE_PLACEHOLDERS: Record<EstablishmentType, { name: string; observations: string }> = {
  [EstablishmentType.Salon]: {
    name: "Ex: Corte Feminino, Coloração, Escova",
    observations: "Ex: Franja mais curta, mechas douradas...",
  },
  [EstablishmentType.Barber]: {
    name: "Ex: Corte Masculino, Barba, Pigmentação",
    observations: "Ex: Cabelo curto nas laterais, barba desenhada...",
  },
  [EstablishmentType.NailsLashes]: {
    name: "Ex: Manicure, Pedicure, Alongamento, Cílios",
    observations: "Ex: Unhas em gel, lashes natural...",
  },
  [EstablishmentType.EstheticsClinic]: {
    name: "Ex: Limpeza de Pele, Depilação, Botox",
    observations: "Ex: Pele sensível, evitar cera quente...",
  },
  [EstablishmentType.SpaMassage]: {
    name: "Ex: Massagem Relaxante, Drenagem",
    observations: "Ex: Foco em relaxamento, óleos aromáticos...",
  },
}

export function getServicePlaceholders(type: EstablishmentType | number) {
  return SERVICE_PLACEHOLDERS[type as EstablishmentType] ?? SERVICE_PLACEHOLDERS[EstablishmentType.Salon]
}
