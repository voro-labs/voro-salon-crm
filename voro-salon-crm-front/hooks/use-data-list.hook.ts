import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export function useDataList<T>(
  endpoint: string,
  options?: {
    pageSize?: number
    extraParams?: Record<string, string>
    /** Primeira pagina buscada no servidor. Ignorada assim que o usuario pagina, busca ou filtra. */
    initialData?: PagedResult<T>
  }
) {
  const initialPageSize = options?.pageSize ?? 20
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [extraParams, setExtraParams] = useState<Record<string, string>>(options?.extraParams ?? {})
  const debouncedSearch = useDebounce(search, 300)

  // Reset to page 1 whenever the debounced search term or extraParams change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedSearch, extraParams])

  // Reset to page 1 when pageSize changes
  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...extraParams,
  })
  const key = `${endpoint}?${params.toString()}`

  // A chave que o servidor buscou. So ela recebe fallbackData: qualquer paginacao, busca
  // ou filtro muda a chave e volta a ser uma requisicao normal do cliente.
  const initialKey = `${endpoint}?${new URLSearchParams({
    page: "1",
    pageSize: String(initialPageSize),
    ...(options?.extraParams ?? {}),
  }).toString()}`

  const hasServerData = key === initialKey && options?.initialData !== undefined

  const { data, isLoading, error, mutate } = useSWR<PagedResult<T>>(key, fetcher, {
    fallbackData: hasServerData ? options?.initialData : undefined,
    // O dado do servidor foi buscado nesta mesma requisicao, entao revalidar na montagem
    // repetiria a chamada que a conversao existe para evitar. Foco, intervalo e troca de
    // chave seguem revalidando normalmente.
    revalidateOnMount: hasServerData ? false : undefined,
  })

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    extraParams,
    setExtraParams,
    isLoading,
    error,
    mutate,
  }
}
