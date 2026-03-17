export type ContentType = "movie" | "series" | "anime" | "song" | "book"

export type Genre =
  | "Action"
  | "Romance"
  | "Comedy"
  | "Drama"
  | "Fantasy"
  | "Sci-Fi"
  | "Horror"
  | "Thriller"
  | "Adventure"
  | "Mystery"
  | "Pop"
  | "Rock"
  | "Classic"
  | "Dystopian"
  | "Documentary"
  | "Slice of Life"

export type Era = "1970s" | "1980s" | "1990s" | "2000s" | "2010s" | "2020+"

export type SwipeAction = "like" | "dislike" | "superlike"

export interface MediaItem {
  id: string
  title: string
  slug: string
  year: number
  type: ContentType
  genres: Genre[]
  description: string
  cover: string
  era: Era
  keywords: string[]
}

export interface SwipeHistoryEntry {
  item: MediaItem
  action: SwipeAction
  timestamp: number
}

/** Scores for a single section (content type) */
export interface SectionProfile {
  genre: Record<string, number>
  era: Record<string, number>
  keywords: Record<string, number>
}

/** Section-specific preference profiles (unified) */
export type PreferenceProfile = SectionProfile

export const ALL_CONTENT_TYPES: ContentType[] = [
  "movie",
  "series",
  "anime",
  "song",
  "book",
]
