export interface ServiceRecordDto {
  id: string
  clientId: string
  serviceId?: string
  serviceName?: string
  appointmentId?: string
  serviceDate: string
  description: string
  amount: number
  notes?: string
  createdAt: string
}
