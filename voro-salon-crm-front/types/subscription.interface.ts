export interface SubscriptionPlanDto {
  id: string
  name: string
  description: string
  monthlyPrice: number
  maxEmployees: number
  maxClients: number
  hasAnamnesis: boolean
  hasFinancial: boolean
  hasReports: boolean
  sortOrder: number
}

export interface TenantSubscriptionDto {
  id: string
  tenantId: string | null
  plan: SubscriptionPlanDto
  status: "Trial" | "Active" | "Inactive" | "Cancelled" | "PastDue"
  paymentSource: "MercadoPago" | "Manual"
  startDate: string
  endDate: string | null
  nextPaymentAt: string | null
  lastPaymentAt: string | null
  contactEmail: string | null
  contactName: string | null
  salonName: string | null
}

export interface CreateCheckoutDto {
  planId: string
  email: string
  name: string
  salonName: string
  tenantId?: string
}

export interface CheckoutResultDto {
  checkoutUrl: string
  subscriptionId: string
}
