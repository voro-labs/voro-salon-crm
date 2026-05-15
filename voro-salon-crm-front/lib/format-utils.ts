/**
 * Formata um valor numérico como moeda BRL (R$).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0)
}

/**
 * Formata duração em minutos para string legível ("30 min", "1h", "1h 30min").
 */
export function formatDuration(minutes: number): string {
  if (!minutes) return ""
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Formata uma string de data ISO para o padrão pt-BR (dd/MM/yyyy).
 * Retorna "-" se a string for inválida ou vazia.
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

/**
 * Formata uma string de data ISO com mês abreviado (ex: "17 set. 2024").
 * Útil para exibições mais compactas em tabelas e cards.
 */
export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Formata uma string de data ISO com dia, mês por extenso, ano, hora e minuto em pt-BR.
 * Ex: "17 de maio de 2024 às 14:30".
 */
export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formata uma string DateOnly (YYYY-MM-DD) em pt-BR sem risco de deslocamento UTC.
 * Use quando a string vem do backend sem componente de hora.
 */
export function formatDateOnly(iso?: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR")
}
