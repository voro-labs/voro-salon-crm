export interface DashboardDataDto {
  totalClients: number
  appointmentsToday: number
  appointmentsThisMonth: number
  revenueThisMonth: number
  recentAlerts?: RecentAlertItem[]
}

export interface RecentAlertItem {
  message: string
  type?: string
  createdAt?: string
}
