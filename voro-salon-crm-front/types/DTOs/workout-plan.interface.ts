import type { WorkoutStatusEnum } from "../Enums/workoutStatusEnum.enum"
import type { WorkoutPlanWeekDto } from "./workout-plan-week.interface"
import type { StudentDto } from "./student.interface"

export interface WorkoutPlanDto {
  id?: string
  studentId?: string
  student?: StudentDto
  status: WorkoutStatusEnum
  notes?: string
  weeks?: WorkoutPlanWeekDto[]
  createdAt?: Date
  updatedAt?: Date
}
