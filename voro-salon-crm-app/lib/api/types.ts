
import { MediaItem, ContentType } from "../types"

export interface APIResult {
  items: MediaItem[]
  error?: string
}

export interface TMDBMovieResult {
  id: number
  title: string
  release_date: string
  genre_ids: number[]
  overview: string
  poster_path: string
  vote_average: number
}

export interface TMDBSeriesResult {
  id: number
  name: string
  first_air_date: string
  genre_ids: number[]
  overview: string
  poster_path: string
  vote_average: number
}

export interface SpotifyTrackResult {
  id: string
  name: string
  album: {
    images: { url: string }[]
    release_date: string
    name: string
  }
  artists: { name: string }[]
  preview_url: string | null
}

export interface AnilistMediaResult {
  id: number
  title: {
    romaji: string
    english: string
    native: string
  }
  type: string
  genres: string[]
  description: string
  seasonYear: number
  coverImage: {
    large: string
  }
  averageScore: number
}

export interface GoogleBookResult {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    description?: string
    imageLinks?: {
      thumbnail: string
    }
    categories?: string[]
    averageRating?: number
  }
}
