export interface SubscriptionPlanDto {
  id: string
  name: string
  description: string
  monthlyPrice: number
  maxEmployees: number
  maxClients: number
  hasEmployees: boolean
  hasAnamnesis: boolean
  hasFinancial: boolean
  hasReports: boolean
  hasBooking: boolean
  hasWhatsAppBot: boolean
  sortOrder: number
  defaultTrialDays: number
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
  trialEndsAt: string | null
}

export interface CreateCheckoutDto {
  planId: string
  email: string
  name: string
  salonName: string
  tenantId?: string
  couponCode?: string
}

export interface CheckoutResultDto {
  checkoutUrl: string | null
  subscriptionId: string
  isTrial: boolean
  trialEndsAt: string | null
}

export interface CouponValidationResultDto {
  code: string
  trialDays: number
  description: string | null
}
