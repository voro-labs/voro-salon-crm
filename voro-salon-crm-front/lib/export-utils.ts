import * as XLSX from "xlsx"

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number
}

function buildWorksheet<T>(columns: ExportColumn<T>[], rows: T[]) {
  const data = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row))),
  ]
  return XLSX.utils.aoa_to_sheet(data)
}

export function exportToExcel<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const ws = buildWorksheet(columns, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Dados")
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToCsv<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const ws = buildWorksheet(columns, rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  // BOM para Excel abrir corretamente com UTF-8
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
