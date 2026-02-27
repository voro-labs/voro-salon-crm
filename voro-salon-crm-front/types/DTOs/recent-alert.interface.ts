import { AlertTypeEnum } from "../Enums/alertTypeEnum.enum"

export interface RecentAlertDto {
  id: string
  message: string
  time: string
  type: AlertTypeEnum
}
