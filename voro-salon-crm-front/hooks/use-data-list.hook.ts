import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { secureApiCall } from "@/lib/api"
import { fetcher } from "@/lib/fetcher"

export function useDataList<T>(
  endpoint: string,
  filterFn: (item: T, search: string) => boolean,
  initialData?: T[]
) {
  const [search, setSearch] = useState("")

  const { data, isLoading, error, mutate } = useSWR<T[]>(endpoint, fetcher, {
    fallbackData: initialData,
  })

  const rawData: T[] = data || []

  // Pre-filter the data based on search input efficiently.
  const filteredData = useMemo(() => {
    if (!search.trim()) return rawData
    const query = search.toLowerCase()
    return rawData.filter((item) => filterFn(item, query))
  }, [rawData, search, filterFn])

  return {
    data: rawData,
    filteredData,
    isLoading,
    error,
    search,
    setSearch,
    mutate,
  }
}
