"use client"

import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToExcel, exportToCsv, type ExportColumn } from "@/lib/export-utils"

interface ExportMenuProps<T> {
  columns: ExportColumn<T>[]
  rows: T[]
  filename: string
  disabled?: boolean
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportMenu<T>({ columns, rows, filename, disabled, className, size = "default" }: ExportMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className={`text-xs sm:text-sm ${className ?? ""}`} disabled={disabled || rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {rows.length} registro{rows.length !== 1 ? "s" : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { void exportToExcel(columns, rows, filename) }}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { void exportToCsv(columns, rows, filename) }}>
          <FileText className="mr-2 h-4 w-4 text-blue-600" />
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
