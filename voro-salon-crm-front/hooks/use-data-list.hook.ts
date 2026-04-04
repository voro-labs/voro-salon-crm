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
  }
) {
  const pageSize = options?.pageSize ?? 20
  const extraParams = options?.extraParams ?? {}

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  // Reset to page 1 whenever the debounced search term changes
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedSearch])

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...extraParams,
  })
  const key = `${endpoint}?${params.toString()}`

  const { data, isLoading, error, mutate } = useSWR<PagedResult<T>>(key, fetcher)

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    isLoading,
    error,
    mutate,
  }
}
