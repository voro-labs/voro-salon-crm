import { API_CONFIG } from "@/lib/api"
import { serverApiGet } from "@/lib/server-api"
import type { PagedResult } from "@/hooks/use-data-list.hook"

import { ClientsView, type ClientItem } from "./clients-view"

const PAGE_SIZE = 10

// Busca a primeira pagina no servidor, com o token do cookie, e entrega pronta para o SWR.
// Sem isso a tela so comecava a pedir dados depois de baixar o JS, hidratar e resolver o
// AuthContext (issue #123, item 3). Se a busca falhar, initialData vem undefined e a tela
// se comporta exatamente como antes.
export default async function ClientsPage() {
  const initialData = await serverApiGet<PagedResult<ClientItem>>(
    `${API_CONFIG.ENDPOINTS.CLIENTS}?page=1&pageSize=${PAGE_SIZE}`
  )

  return <ClientsView initialData={initialData ?? undefined} />
}
