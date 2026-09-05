import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"

import { EmployeesView, type EmployeeItem } from "./employees-view"

const PAGE_SIZE = 10

// Mesma conversão de /clients: a primeira página vem do servidor, com o token do cookie,
// e o SWR a recebe como fallbackData. Falhou? initialData vem undefined e a tela busca no
// cliente como antes (issue #123, item 3).
export default async function EmployeesPage() {
  const initialData = await serverApiGet<PagedResult<EmployeeItem>>(
    `${API_CONFIG.ENDPOINTS.EMPLOYEES}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <EmployeesView initialData={initialData ?? undefined} />
}
