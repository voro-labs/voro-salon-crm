
import { MediaItem, Genre } from "../types"
import { APIResult, TMDBMovieResult, TMDBSeriesResult } from "./types"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const BASE_URL = "https://api.themoviedb.org/3"

// Map TMDB Genre IDs to our Genre type
const GENRE_MAP: Record<number, Genre> = {
  28: "Action",
  12: "Adventure",
  16: "Fantasy", // Animation -> Fantasy (approx)
  35: "Comedy",
  80: "Thriller", // Crime -> Thriller
  99: "Documentary",
  18: "Drama",
  10751: "Slice of Life", // Family -> Slice of Life
  14: "Fantasy",
  36: "Classic", // History -> Classic
  27: "Horror",
  10402: "Pop", // Music -> Pop
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "Classic", // TV Movie
  53: "Thriller",
  10752: "Action", // War -> Action
  37: "Adventure", // Western -> Adventure
  10759: "Action", // Action & Adventure (TV)
  10762: "Slice of Life", // Kids (TV)
  10763: "Documentary", // News (TV)
  10764: "Slice of Life", // Reality (TV)
  10765: "Sci-Fi", // Sci-Fi & Fantasy (TV)
  10766: "Drama", // Soap (TV)
  10767: "Slice of Life", // Talk (TV)
  10768: "Action", // War & Politics (TV)
}

function getEra(dateString?: string): MediaItem["era"] {
  if (!dateString) return "2020+"
  const year = parseInt(dateString.split("-")[0])
  if (year >= 2020) return "2020+"
  if (year >= 2010) return "2010s"
  if (year >= 2000) return "2000s"
  if (year >= 1990) return "1990s"
  if (year >= 1980) return "1980s"
  return "1970s"
}

function mapMovie(item: TMDBMovieResult): MediaItem {
  return {
    id: `movie-${item.id}`,
    title: item.title,
    year: parseInt(item.release_date?.split("-")[0] || "2024"),
    type: "movie",
    genres: Array.from(new Set(item.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean))) as Genre[],
    description: item.overview,
    cover: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    era: getEra(item.release_date),
    keywords: [], // TMDB keywords would require another API call
  }
}

function mapSeries(item: TMDBSeriesResult): MediaItem {
  return {
    id: `series-${item.id}`,
    title: item.name,
    year: parseInt(item.first_air_date?.split("-")[0] || "2024"),
    type: "series",
    genres: Array.from(new Set(item.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean))) as Genre[],
    description: item.overview,
    cover: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    era: getEra(item.first_air_date),
    keywords: [],
  }
}

export async function getTrendingMovies(page: number = 1): Promise<APIResult> {
  if (!TMDB_API_KEY) return { items: [], error: "Missing TMDB_API_KEY" }

  try {
    const res = await fetch(
      `${BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    )
    if (!res.ok) throw new Error("Failed to fetch movies")
    const data = await res.json()
    return { items: data.results.map(mapMovie) }
  } catch (error) {
    console.error("TMDB Movie Error:", error)
    return { items: [], error: "Failed to fetch movies" }
  }
}

export async function getTrendingSeries(page: number = 1): Promise<APIResult> {
  if (!TMDB_API_KEY) return { items: [], error: "Missing TMDB_API_KEY" }

  try {
    const res = await fetch(
      `${BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    )
    if (!res.ok) throw new Error("Failed to fetch series")
    const data = await res.json()
    return { items: data.results.map(mapSeries) }
  } catch (error) {
    console.error("TMDB Series Error:", error)
    return { items: [], error: "Failed to fetch series" }
  }
}

