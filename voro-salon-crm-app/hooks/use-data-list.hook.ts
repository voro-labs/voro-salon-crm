import { useState, useEffect } from "react"
import { secureApiCall } from "lib/api"

export function useDataList<T>(
  endpoint: string,
  filterFn?: (item: T, search: string) => boolean,
  initialData?: T[]
) {
  const PAGE_SIZE = 20

  const [items, setItems] = useState<T[]>(initialData ?? [])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [search, setSearchRaw] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [extraParams, setExtraParams] = useState<Record<string, string>>({})

  // Debounce: 300ms delay before committing search to API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const setSearch = setSearchRaw

  // Reset and re-fetch whenever the debounced search, endpoint or extraParams change
  useEffect(() => {
    setItems([])
    setPage(1)
    fetchPage(1, debouncedSearch, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, endpoint, JSON.stringify(extraParams)])

  async function fetchPage(p: number, q: string, replace: boolean) {
    if (replace) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
      })
      if (q) params.set("search", q)
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))

      const res = await secureApiCall<{
        items: T[]
        totalCount: number
        page: number
        pageSize: number
        totalPages: number
      }>(`${endpoint}?${params.toString()}`, { method: "GET" })

      if (!res.hasError && res.data) {
        const { items: newItems, totalPages: tp, totalCount: tc } = res.data
        setTotalPages(tp)
        setTotalCount(tc)
        setItems((prev) => (replace ? newItems : [...prev, ...newItems]))
        setPage(p)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  function loadMore() {
    if (isLoadingMore || isLoading || page >= totalPages) return
    fetchPage(page + 1, debouncedSearch, false)
  }

  function refresh() {
    setItems([])
    setPage(1)
    fetchPage(1, debouncedSearch, true)
  }

  return {
    // Primary API
    items,
    isLoading,
    isLoadingMore,
    hasMore: page < totalPages,
    totalCount,
    search,
    setSearch,
    extraParams,
    setExtraParams,
    loadMore,
    refresh,
    // Backward-compat aliases
    data: items,
    filteredData: items,
    mutate: refresh,
    error: null,
  }
}
