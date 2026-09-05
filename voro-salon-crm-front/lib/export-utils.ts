export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number
}

// O xlsx é pesado e só serve no clique de exportar. Importado no topo, ele entrava no
// bundle de toda tela que mostra o menu de exportação; carregado sob demanda, chega
// apenas para quem realmente exporta (issue #123, item 4).
async function loadXlsx() {
  return await import("xlsx")
}

function buildWorksheet<T>(
  xlsx: typeof import("xlsx"),
  columns: ExportColumn<T>[],
  rows: T[],
) {
  const data = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row))),
  ]
  return xlsx.utils.aoa_to_sheet(data)
}

export async function exportToExcel<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const XLSX = await loadXlsx()
  const ws = buildWorksheet(XLSX, columns, rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Dados")
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export async function exportToCsv<T>(
  columns: ExportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const XLSX = await loadXlsx()
  const ws = buildWorksheet(XLSX, columns, rows)
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
