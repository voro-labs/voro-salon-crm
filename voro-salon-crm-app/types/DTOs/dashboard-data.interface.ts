export interface RevenueByMonthItem {
  monthLabel: string
  total: number
  count: number
}

export interface TopClientItem {
  name: string
  serviceCount: number
  totalSpent: number
}

export interface RecentAlertItem {
  message: string
  type?: string
  createdAt?: string
}

export interface DashboardDataDto {
  totalClients: number
  appointmentsToday: number
  appointmentsThisMonth: number
  revenueThisMonth: number
  monthlyRevenue?: number
  monthlyServiceCount?: number
  revenueByMonth?: RevenueByMonthItem[]
  topClients?: TopClientItem[]
  recentAlerts?: RecentAlertItem[]
}
