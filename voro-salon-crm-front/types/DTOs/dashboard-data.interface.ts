import type { DashboardStatsDto } from "./dashboard-stats.interface"
import type { UpcomingWorkoutDto } from "./upcoming-workout.interface"
import type { RecentAlertDto } from "./recent-alert.interface"
import type { StudentProgressDto } from "./student-progress.interface"

export interface DashboardDataDto {
  stats: DashboardStatsDto
  upcomingWorkouts: UpcomingWorkoutDto[]
  recentAlerts: RecentAlertDto[]
  studentProgress: StudentProgressDto[]
}
