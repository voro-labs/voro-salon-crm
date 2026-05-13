export interface BusinessHoursDay {
  dayOfWeek: number
  isOpen: boolean
  ranges: { openTime: string; closeTime: string }[]
}

export const HOUR_HEIGHT = 64 // px per hour

export const STATUS_COLORS: Record<number, string> = {
  0: "bg-amber-100 border-amber-300 text-amber-900",
  1: "bg-blue-100 border-blue-300 text-blue-900",
  2: "bg-emerald-100 border-emerald-300 text-emerald-900",
  3: "bg-red-100 border-red-300 text-red-900",
  4: "bg-gray-100 border-gray-300 text-gray-700",
}
