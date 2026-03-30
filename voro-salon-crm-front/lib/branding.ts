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
    description: "Gerencie agenda, clientes e financeiro do seu salão de beleza. WhatsApp integrado, pagamentos e relatórios. Teste grátis por 14 dias.",
    hostname: "salon-crm.vorolabs.app"
  },
  [EstablishmentType.Barber]: {
    productName: "Voro Barber",
    shortName: "Voro Barber",
    establishmentLabel: "barbearia",
    establishmentLabelPlural: "barbearias",
    description: "Sistema completo para barbearia: agendamento online, controle de clientes e financeiro. WhatsApp Bot integrado. Teste grátis 14 dias.",
    hostname: "barber-crm.vorolabs.app"
  },
  [EstablishmentType.Petshop]: {
    productName: "Voro PetShop",
    shortName: "Voro PetShop",
    establishmentLabel: "petshop",
    establishmentLabelPlural: "petshops",
    description: "Gerencie seu pet shop com agendamento, prontuários e financeiro em um só lugar. WhatsApp integrado. Teste grátis por 14 dias.",
    hostname: "petshop-crm.vorolabs.app"
  },
}

const HOSTNAME_MAP: Record<string, EstablishmentType> = {
  "salon-crm.vorolabs.app": EstablishmentType.Salon,
  "barber-crm.vorolabs.app": EstablishmentType.Barber,
  "petshop-crm.vorolabs.app": EstablishmentType.Petshop,
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
