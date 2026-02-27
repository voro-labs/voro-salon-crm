import { MealPeriodEnum } from "../Enums/mealPeriodEnum.enum"

export interface MealPlanMealDto {
  id?: string | null
  mealPlanDayId?: string | null
  period: MealPeriodEnum
  time?: string
  description: string
  quantity?: string
  notes?: string
  order: number
}
