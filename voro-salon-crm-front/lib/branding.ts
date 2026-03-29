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
    productName: "Voro Salon CRM",
    shortName: "Salon CRM",
    establishmentLabel: "salão",
    establishmentLabelPlural: "salões",
    description: "Sistema de gerenciamento de clientes e serviços para salões de beleza",
    hostname: "salon-crm.vorolabs.app"
  },
  [EstablishmentType.Barber]: {
    productName: "Voro Barber CRM",
    shortName: "Barber CRM",
    establishmentLabel: "barbearia",
    establishmentLabelPlural: "barbearias",
    description: "Sistema de gerenciamento de clientes e serviços para barbearias",
    hostname: "barber-crm.vorolabs.app"
  },
  [EstablishmentType.Petshop]: {
    productName: "Voro Petshop CRM",
    shortName: "Petshop CRM",
    establishmentLabel: "petshop",
    establishmentLabelPlural: "petshops",
    description: "Sistema de gerenciamento de clientes e serviços para petshops",
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
