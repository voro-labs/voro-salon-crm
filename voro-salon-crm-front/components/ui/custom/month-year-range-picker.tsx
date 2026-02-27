"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MonthYearRangePickerProps {
  startDate?: Date
  endDate?: Date
  onRangeChange?: (start: Date | undefined, end: Date | undefined) => void
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export function MonthYearRangePicker({ startDate, endDate, onRangeChange }: MonthYearRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [tempStart, setTempStart] = React.useState<Date | undefined>(startDate)
  const [tempEnd, setTempEnd] = React.useState<Date | undefined>(endDate)
  const [startYear, setStartYear] = React.useState(startDate?.getUTCFullYear() || new Date().getUTCFullYear())
  const [endYear, setEndYear] = React.useState(endDate?.getUTCFullYear() || new Date().getUTCFullYear())

  const formatDateRange = () => {
    if (!startDate || !endDate) return "Selecione o período"
    const startMonth = MONTHS[startDate.getUTCMonth()]
    const endMonth = MONTHS[endDate.getUTCMonth()]
    return `${startMonth} ${startDate.getUTCFullYear()} - ${endMonth} ${endDate.getUTCFullYear()}`
  }

  const handleMonthSelect = (month: number, isStart: boolean) => {
    const year = isStart ? startYear : endYear
    const date = new Date(year, month, 1)
    isStart ? setTempStart(date) : setTempEnd(date)
  }

  const handleApply = () => {
    onRangeChange?.(tempStart, tempEnd)
    setOpen(false)
  }

  const handleCancel = () => {
    setTempStart(startDate)
    setTempEnd(endDate)
    setStartYear(startDate?.getUTCFullYear() || new Date().getUTCFullYear())
    setEndYear(endDate?.getUTCFullYear() || new Date().getUTCFullYear())
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-0 hover:bg-transparent">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          <span className="text-xs sm:text-sm text-muted-foreground">{formatDateRange()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row gap-4 p-4">
          {/* Start Date Selector */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStartYear(startYear - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{startYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStartYear(startYear + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-3 gap-2">
              {MONTHS.map((month, index) => (
                <Button
                  key={month}
                  variant={tempStart?.getUTCMonth() === index && tempStart?.getUTCFullYear() === startYear ? "default" : "outline"}
                  className="h-9 text-xs sm:text-sm"
                  onClick={() => handleMonthSelect(index, true)}
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>

          {/* End Date Selector */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEndYear(endYear - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{endYear}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEndYear(endYear + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-3 gap-2">
              {MONTHS.map((month, index) => (
                <Button
                  key={month}
                  variant={tempEnd?.getUTCMonth() === index && tempEnd?.getUTCFullYear() === endYear ? "default" : "outline"}
                  className="h-9 text-xs sm:text-sm"
                  onClick={() => handleMonthSelect(index, false)}
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 p-3 border-t">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleApply} className="w-full sm:w-auto">
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
