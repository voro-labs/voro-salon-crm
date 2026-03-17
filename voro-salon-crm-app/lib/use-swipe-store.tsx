import React, { createContext, useContext, useCallback, useState, useMemo, useEffect, useRef } from "react"
import * as SecureStore from 'expo-secure-store';

import {
  MediaItem,
  ContentType,
  Genre,
  Era,
  SwipeAction,
  SwipeHistoryEntry,
  PreferenceProfile,
  SectionProfile,
  ALL_CONTENT_TYPES,
} from "./types"

import { extractKeywords } from "./keyword-extractor"
import { useAuth } from "../contexts/auth.context"

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/v1`

// Mapping for Backend Enums
const CONTENT_TYPE_TO_ENUM: Record<ContentType, number> = {
  movie: 100,
  series: 200,
  anime: 300,
  song: 400,
  book: 500,
}

const ENUM_TO_CONTENT_TYPE: Record<number, ContentType> = Object.fromEntries(
  Object.entries(CONTENT_TYPE_TO_ENUM).map(([k, v]) => [v, k as ContentType])
)

const ERA_TO_ENUM: Record<Era, number> = {
  "1970s": 100,
  "1980s": 200,
  "1990s": 300,
  "2000s": 400,
  "2010s": 500,
  "2020+": 600,
}

const ENUM_TO_ERA: Record<number, Era> = Object.fromEntries(
  Object.entries(ERA_TO_ENUM).map(([k, v]) => [v, k as Era])
)

const ACTION_TO_ENUM: Record<SwipeAction, number> = {
  like: 100,
  dislike: 200,
  superlike: 300,
}

const ENUM_TO_ACTION: Record<number, SwipeAction> = {
  100: "like",
  200: "dislike",
  300: "superlike",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDtoToMediaItem(dto: any): MediaItem {
  return {
    id: dto.id,
    title: dto.title,
    slug: dto.slug,
    year: dto.year,
    type: ENUM_TO_CONTENT_TYPE[dto.type] ?? "movie",
    description: dto.description ?? "",
    cover: dto.coverUrl ?? "",
    era: ENUM_TO_ERA[dto.era] ?? "2020+",
    genres: (dto.genres ?? []).map((g: any) => g.genre?.name ?? g.name ?? g),
    keywords: (dto.keywords ?? []).map((k: any) => k.keyword?.name ?? k.name ?? k),
  }
}

function mapMediaItemToDto(item: MediaItem) {
  return {
    Id: item.id,
    Title: item.title,
    Slug: item.slug,
    Year: item.year,
    Type: CONTENT_TYPE_TO_ENUM[item.type],
    Description: item.description,
    CoverUrl: item.cover,
    Era: ERA_TO_ENUM[item.era],
    Genres: item.genres.map(g => ({ Genre: { Name: g } })),
    Keywords: item.keywords.map(k => ({ Keyword: { Name: k } }))
  }
}

export interface Filters {
  contentType: ContentType | "all"
  genre: Genre | "all"
  era: Era | "all"
}

const SCORE_MAP: Record<SwipeAction, number> = {
  dislike: -2,
  like: 3,
  superlike: 6,
}

function buildEmptySection(): SectionProfile {
  return { genre: {}, era: {}, keywords: {} }
}

function buildInitialProfile(): PreferenceProfile {
  return buildEmptySection()
}

function applySectionScore(
  profile: PreferenceProfile,
  item: MediaItem,
  action: SwipeAction
): PreferenceProfile {
  const score = SCORE_MAP[action]

  const next: PreferenceProfile = {
    genre: { ...profile.genre },
    era: { ...profile.era },
    keywords: { ...profile.keywords },
  }

  for (const g of item.genres) {
    next.genre[g] = (next.genre[g] || 0) + score
  }

  next.era[item.era] = (next.era[item.era] || 0) + score

  let keywordsToScore = [...item.keywords]
  if (keywordsToScore.length === 0 && item.description) {
    keywordsToScore = extractKeywords(item.description)
  }

  for (const kw of keywordsToScore) {
    next.keywords[kw] = (next.keywords[kw] || 0) + score
  }

  return next
}

function revertSectionScore(
  profile: PreferenceProfile,
  item: MediaItem,
  action: SwipeAction
): PreferenceProfile {
  const score = SCORE_MAP[action]

  const next: PreferenceProfile = {
    genre: { ...profile.genre },
    era: { ...profile.era },
    keywords: { ...profile.keywords },
  }

  for (const g of item.genres) {
    next.genre[g] = (next.genre[g] || 0) - score
  }

  next.era[item.era] = (next.era[item.era] || 0) - score

  for (const kw of item.keywords) {
    next.keywords[kw] = (next.keywords[kw] || 0) - score
  }

  return next
}

function recommendationScore(
  item: MediaItem,
  sectionProfile: SectionProfile
): number {
  let score = 0

  for (const g of item.genres) {
    score += sectionProfile.genre[g] || 0
  }

  score += sectionProfile.era[item.era] || 0

  for (const kw of item.keywords) {
    score += (sectionProfile.keywords[kw] || 0) * 0.5
  }

  return score
}

interface SwipeContextType {
  items: MediaItem[]
  liked: MediaItem[]
  disliked: MediaItem[]
  superLiked: MediaItem[]
  history: SwipeHistoryEntry[]
  profile: PreferenceProfile
  filters: Filters
  setFilters: (filters: Filters) => void
  like: (item: MediaItem) => void
  dislike: (item: MediaItem) => void
  superLike: (item: MediaItem) => void
  undo: () => void
  canUndo: boolean
  isLoading: boolean
  hasCompletedOnboarding: boolean
  setHasCompletedOnboarding: (val: boolean) => void
  isSyncing: boolean
}

const SwipeContext = createContext<SwipeContextType | undefined>(undefined)

export function SwipeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const token = user?.token
  const signOut = logout

  // Debug log for authentication
  useEffect(() => {
    console.log("[SwipeProvider] Auth State:", { isAuthenticated, hasToken: !!token });
  }, [isAuthenticated, token]);

  const [items, setItems] = useState<MediaItem[]>([])
  const [liked, setLiked] = useState<MediaItem[]>([])
  const [disliked, setDisliked] = useState<MediaItem[]>([])
  const [superLiked, setSuperLiked] = useState<MediaItem[]>([])
  const [history, setHistory] = useState<SwipeHistoryEntry[]>([])
  const [profile, setProfile] = useState<PreferenceProfile>(buildInitialProfile)
  const [filters, setFilters] = useState<Filters>({
    contentType: "all",
    genre: "all",
    era: "all",
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isStorageLoaded, setIsStorageLoaded] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const syncWithApi = useCallback(async (currentData: {
    liked: MediaItem[],
    disliked: MediaItem[],
    superLiked: MediaItem[],
    history: SwipeHistoryEntry[],
    profile: PreferenceProfile,
    hasCompletedOnboarding: boolean
  }) => {
    console.log("[SwipeProvider] Attempting sync...", { isAuthenticated, hasToken: !!token });
    if (!isAuthenticated || !token) {
      console.warn("[SwipeProvider] Sync aborted: Not authenticated or no token");
      return
    }

    setIsSyncing(true)
    try {
      const payload = {
        Liked: currentData.liked.map(mapMediaItemToDto),
        Disliked: currentData.disliked.map(mapMediaItemToDto),
        SuperLiked: currentData.superLiked.map(mapMediaItemToDto),
        History: currentData.history.map(h => ({
          MediaItemId: h.item.id,
          MediaItem: mapMediaItemToDto(h.item),
          Action: ACTION_TO_ENUM[h.action],
          Timestamp: new Date(h.timestamp).toISOString()
        })),
        Profile: {
          GenreScores: Object.entries(currentData.profile.genre).map(([genre, score]) => ({ GenreName: genre, Score: score })),
          EraScores: Object.entries(currentData.profile.era).map(([era, score]) => ({ Era: ERA_TO_ENUM[era as Era], Score: score })),
          KeywordScores: Object.entries(currentData.profile.keywords).map(([keyword, score]) => ({ KeywordName: keyword, Score: score }))
        },
        HasCompletedOnboarding: currentData.hasCompletedOnboarding
      }

      console.log("[SwipeProvider] Sending sync payload:", payload);

      const response = await fetch(`${BASE_URL}/user/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.status === 401) {
        console.warn("[SwipeProvider] Unauthorized sync request. Logging out...");
        await signOut();
        return;
      }

      // Try to parse JSON only if there is content
      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      console.log("[SwipeProvider] Sync result:", { status: response.status, ok: response.ok, result });

      if (!response.ok) {
        throw new Error(result.message || "Sync failed");
      }
    } catch (e) {
      console.error("[SwipeProvider] Failed to sync with API", e)
    } finally {
      setIsSyncing(false)
    }
  }, [isAuthenticated, token, signOut])

  const debouncedSync = useCallback((data: any) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      syncWithApi(data)
    }, 2000)
  }, [syncWithApi])

  const deduplicateItems = useCallback(
    (existing: MediaItem[], incoming: MediaItem[]) => {
      const existingIds = new Set(existing.map((i) => i.id))
      const existingTitles = new Set(
        existing.map((i) => i.title.toLowerCase().trim())
      )

      return incoming.filter((item) => {
        const normalizedTitle = item.title.toLowerCase().trim()

        if (existingIds.has(item.id)) return false
        if (existingTitles.has(normalizedTitle)) return false

        existingIds.add(item.id)
        existingTitles.add(normalizedTitle)
        return true
      })
    },
    []
  )

  const fetchAllContent = useCallback(async (pageNum: number) => {
    if (!token) return []
    try {
      const res = await fetch(`${BASE_URL}/content/trending?page=${pageNum}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.status === 401) {
        console.warn("[SwipeProvider] Unauthorized content request. Logging out...");
        await signOut();
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch content")
      const json = await res.json()
      const raw: unknown[] = Array.isArray(json) ? json : (json?.data ?? [])
      return raw.map(mapDtoToMediaItem)
    } catch (e) {
      console.error("Error fetching content:", e)
      return []
    }
  }, [token, signOut])

  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated || !token) return null

    try {
      const res = await fetch(`${BASE_URL}/user/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.status === 401) {
        console.warn("[SwipeProvider] Unauthorized data request. Logging out...");
        await signOut();
        return null;
      }
      if (!res.ok) return null
      const json = await res.json()
      const data = json.data

      if (!data) return null

      // Reconstruct frontend state from DTO
      const profile = buildInitialProfile()
      if (data.profile) {
        data.profile.genreScores?.forEach((gs: any) => profile.genre[gs.genreName] = gs.score);
        data.profile.eraScores?.forEach((es: any) => {
          const era = ENUM_TO_ERA[es.era];
          if (era) profile.era[era] = es.score;
        });
        data.profile.keywordScores?.forEach((ks: any) => profile.keywords[ks.keywordName] = ks.score);
      }

      return {
        liked: (data.liked || []).map(mapDtoToMediaItem),
        disliked: (data.disliked || []).map(mapDtoToMediaItem),
        superLiked: (data.superLiked || []).map(mapDtoToMediaItem),
        history: (data.history || []).map((h: any) => ({
          item: mapDtoToMediaItem(h.mediaItem),
          action: ENUM_TO_ACTION[h.action] || "like",
          timestamp: new Date(h.timestamp).getTime()
        })),
        profile,
        hasCompletedOnboarding: data.hasCompletedOnboarding ?? false
      }
    } catch (e) {
      console.error("Failed to fetch user data", e)
      return null
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!token) return
    const loadInitial = async () => {
      try {
        const data = await fetchAllContent(page)
        const enriched = data.map((item: MediaItem) => {
          if ((!item.keywords || item.keywords.length === 0) && item.description) {
            return { ...item, keywords: extractKeywords(item.description) }
          }
          return item
        })
        const unique = deduplicateItems([], enriched)
        setItems(unique)
      } catch (e) {
        setError("Failed to load content")
      } finally {
        setIsLoading(false)
      }
    }
    loadInitial()
  }, [token, fetchAllContent])

  const loadMore = useCallback(async () => {
    if (isLoading || isFetchingMore || error || !token) return
    setIsFetchingMore(true)
    const nextPage = page + 1
    try {
      const newItems = await fetchAllContent(nextPage)
      if (newItems.length > 0) {
        setPage(nextPage)
        const enriched = newItems.map((item: MediaItem) => {
          if ((!item.keywords || item.keywords.length === 0) && item.description) {
            return { ...item, keywords: extractKeywords(item.description) }
          }
          return item
        })
        enriched.sort((a, b) => recommendationScore(b, profile) - recommendationScore(a, profile))
        setItems((prev) => [...prev, ...deduplicateItems(prev, enriched)])
      }
    } catch {
      setError("Failed to load more content")
    } finally {
      setIsFetchingMore(false)
    }
  }, [page, isLoading, isFetchingMore, profile, error, token, fetchAllContent])

  const swipedIds = useMemo(() => new Set([
    ...liked.map(i => i.id),
    ...disliked.map(i => i.id),
    ...superLiked.map(i => i.id)
  ]), [liked, disliked, superLiked])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (swipedIds.has(item.id)) return false
      if (filters.contentType !== "all" && item.type !== filters.contentType) return false
      if (filters.genre !== "all" && !item.genres.includes(filters.genre)) return false
      if (filters.era !== "all" && item.era !== filters.era) return false
      return true
    })
  }, [items, swipedIds, filters])

  useEffect(() => {
    if (!isLoading && !isFetchingMore && !error && filteredItems.length < 5) {
      loadMore()
    }
  }, [filteredItems.length])

  const [isReadyToSync, setIsReadyToSync] = useState(false)

  const mergeData = useCallback((local: any, remote: any) => {
    // Deduplicate by Slug
    const mergeItems = (l: MediaItem[], r: MediaItem[]) => {
      const map = new Map<string, MediaItem>()
      l.forEach(i => map.set(i.slug, i))
      r.forEach(i => map.set(i.slug, i))
      return Array.from(map.values())
    }

    // Merge history with timestamp priority
    const mergeHistory = (l: SwipeHistoryEntry[], r: SwipeHistoryEntry[]) => {
      const map = new Map<string, SwipeHistoryEntry>()
      l.forEach(h => map.set(h.item.slug, h))
      r.forEach(h => {
        const existing = map.get(h.item.slug)
        if (!existing || h.timestamp > existing.timestamp) {
          map.set(h.item.slug, h)
        }
      })
      return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp)
    }

    return {
      liked: mergeItems(local.liked || [], remote.liked || []),
      disliked: mergeItems(local.disliked || [], remote.disliked || []),
      superLiked: mergeItems(local.superLiked || [], remote.superLiked || []),
      history: mergeHistory(local.history || [], remote.history || []),
      profile: remote.profile || local.profile || buildInitialProfile(),
      hasCompletedOnboarding: remote.hasCompletedOnboarding || local.hasCompletedOnboarding || false
    }
  }, [])

  useEffect(() => {
    const loadState = async () => {
      console.log("[SwipeProvider] Starting initialization...");

      let localState: any = null
      try {
        const saved = await SecureStore.getItemAsync("voro-swipe-entertainment-storage")
        if (saved) {
          localState = JSON.parse(saved)
          console.log("[SwipeProvider] Local state loaded");
        }
      } catch (e) {
        console.error("[SwipeProvider] Error loading local state", e);
      }

      // Initial set from local logic
      if (localState) {
        setLiked(localState.liked || [])
        setDisliked(localState.disliked || [])
        setSuperLiked(localState.superLiked || [])
        setHistory(localState.history || [])
        setProfile(localState.profile || buildInitialProfile())
        setHasCompletedOnboarding(localState.hasCompletedOnboarding || false)
      }

      if (isAuthenticated && token) {
        console.log("[SwipeProvider] Fetching remote data for merge...");
        const remoteState = await fetchUserData()
        if (remoteState) {
          const merged = mergeData(localState || {}, remoteState)
          console.log("[SwipeProvider] Data merged successfully");
          setLiked(merged.liked)
          setDisliked(merged.disliked)
          setSuperLiked(merged.superLiked)
          setHistory(merged.history)
          setProfile(merged.profile)
          setHasCompletedOnboarding(merged.hasCompletedOnboarding)
        }
      }

      setIsStorageLoaded(true)
      setIsReadyToSync(true)
      console.log("[SwipeProvider] Initialization complete, sync enabled");
    }
    loadState()
  }, [isAuthenticated, token, fetchUserData, mergeData])

  useEffect(() => {
    if (!isStorageLoaded || !isReadyToSync) return

    const persist = async () => {
      const data = { liked, disliked, superLiked, history, profile, filters, hasCompletedOnboarding }

      try {
        await SecureStore.setItemAsync("voro-swipe-entertainment-storage", JSON.stringify(data))
      } catch (e) {
        console.warn("[SwipeProvider] SecureStore persistence warning (likely size limit)", e);
      }

      if (isAuthenticated) {
        debouncedSync(data)
      }
    }
    persist()
  }, [liked, disliked, superLiked, history, profile, filters, hasCompletedOnboarding, isStorageLoaded, isReadyToSync, isAuthenticated, debouncedSync])

  const like = useCallback((item: MediaItem) => {
    setLiked((prev) => [...prev, item])
    setHistory((prev) => [...prev, { item, action: "like", timestamp: Date.now() }])
    setProfile((prev) => applySectionScore(prev, item, "like"))
  }, [])

  const dislike = useCallback((item: MediaItem) => {
    setDisliked((prev) => [...prev, item])
    setHistory((prev) => [...prev, { item, action: "dislike", timestamp: Date.now() }])
    setProfile((prev) => applySectionScore(prev, item, "dislike"))
  }, [])

  const superLike = useCallback((item: MediaItem) => {
    setSuperLiked((prev) => [...prev, item])
    setHistory((prev) => [...prev, { item, action: "superlike", timestamp: Date.now() }])
    setProfile((prev) => applySectionScore(prev, item, "superlike"))
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setProfile((p) => revertSectionScore(p, last.item, last.action))

      if (last.action === "like") setLiked(l => l.filter(i => i.id !== last.item.id))
      if (last.action === "dislike") setDisliked(d => d.filter(i => i.id !== last.item.id))
      if (last.action === "superlike") setSuperLiked(s => s.filter(i => i.id !== last.item.id))

      return prev.slice(0, -1)
    })
  }, [])

  const value = {
    items: filteredItems,
    liked,
    disliked,
    superLiked,
    history,
    profile,
    filters,
    setFilters,
    like,
    dislike,
    superLike,
    undo,
    canUndo: history.length > 0,
    isLoading,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    isSyncing
  }

  return <SwipeContext.Provider value={value}>{children}</SwipeContext.Provider>
}

export function useSwipeStore() {
  const context = useContext(SwipeContext)
  if (context === undefined) {
    throw new Error('useSwipeStore must be used within a SwipeProvider')
  }
  return context
}
