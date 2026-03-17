// Utilitários para conversão de datas

/**
 * Converte data ISO completa (2002-09-17T00:00:00Z) para formato yyyy-MM-dd
 * @param isoString - String no formato ISO completo
 * @returns String no formato yyyy-MM-dd ou string vazia se inválida
 */
export function formatDateToInput(isoDate: string | undefined): string {
  if (!isoDate) return ""
  const date = new Date(isoDate)
  const day = date.getUTCDate().toString().padStart(2, "0")
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
  const year = date.getUTCFullYear()
  return `${year}-${month}-${day}`
}

/**
 * Converte data yyyy-MM-dd para formato brasileiro dd/MM/yyyy
 * @param isoDate - String no formato yyyy-MM-dd
 * @returns String no formato dd/MM/yyyy
 */
export function formatDateToBR(isoDate: string): string {
  if (!isoDate) return ""

  try {
    const date = new Date(isoDate)
    const day = date.getUTCDate().toString().padStart(2, "0")
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0")
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  } catch (error) {
    console.error("Erro ao formatar data para BR:", error)
    return ""
  }
}

/**
 * Converte data brasileira dd/MM/yyyy para formato ISO yyyy-MM-dd
 * @param brDate - String no formato dd/MM/yyyy
 * @returns String no formato yyyy-MM-dd
 */
export function formatDateToISO(brDate: string): string {
  if (!brDate || brDate.length !== 10) return ""

  try {
    const [day, month, year] = brDate.split("/")
    if (!day || !month || !year) return ""
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  } catch (error) {
    console.error("Erro ao converter data para ISO:", error)
    return ""
  }
}

/**
 * Valida se uma data no formato dd/MM/yyyy é válida
 * @param dateString - String no formato dd/MM/yyyy
 * @returns boolean indicando se a data é válida
 */
export function isValidBRDate(dateString: string): boolean {
  if (dateString.length !== 10) return false

  try {
    const [day, month, year] = dateString.split("/").map(Number)
    if (!day || !month || !year) return false

    const date = new Date(year, month - 1, day)
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getDate() === day
  } catch (error) {
    return false
  }
}

/**
 * Calcula a idade baseada na data de nascimento
 * @param birthDate - String no formato yyyy-MM-dd ou ISO completo
 * @returns Idade em anos
 */
export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0

  try {
    const dateOnly = birthDate.includes("T") ? birthDate.split("T")[0] : birthDate
    const birth = new Date(dateOnly + "T00:00:00")
    const today = new Date()

    let age = today.getUTCFullYear() - birth.getUTCFullYear()
    const monthDiff = today.getUTCMonth() - birth.getUTCMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  } catch (error) {
    console.error("Erro ao calcular idade:", error)
    return 0
  }
}

export function convertTimeSpanUtcToDateBR(timeSpan: string, timeZone: string = 'America/Sao_Paulo'): Date {
  // Exemplo de entrada: "15:30:00"
  const [hours, minutes, seconds] = timeSpan.split(':').map(Number);

  // Criar um Date UTC fictício (usando uma data qualquer, o importante é a hora)
  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));

  // Agora converter para o fuso desejado
  const localTime = new Intl.DateTimeFormat('pt-BR', {
    hour12: false,
    timeZone
  }).format(utcDate);

  return new Date(localTime);
}

export function convertTimeSpanUtcToLocal(timeSpan: string, timeZone: string = 'America/Sao_Paulo'): string {
  // Exemplo de entrada: "15:30:00"
  const [hours, minutes, seconds] = timeSpan.split(':').map(Number);

  // Criar um Date UTC fictício (usando uma data qualquer, o importante é a hora)
  const utcDate = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));

  // Agora converter para o fuso desejado
  const localTime = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).format(utcDate);

  return localTime;
}
