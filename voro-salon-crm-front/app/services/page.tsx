import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"

import { ServicesView, type ServiceItem } from "./services-view"

const PAGE_SIZE = 10

// Igual a /clients e /employees. As promoções continuam sendo buscadas no cliente: elas
// alimentam o preço exibido por item, não a primeira pintura da lista.
export default async function ServicesPage() {
  const initialData = await serverApiGet<PagedResult<ServiceItem>>(
    `${API_CONFIG.ENDPOINTS.SERVICES}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <ServicesView initialData={initialData ?? undefined} />
}
