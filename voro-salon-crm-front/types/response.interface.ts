export interface ResponseViewModel<T = any> {
  status: number
  message?: string | null
  data?: T | null
  hasError: boolean
}
