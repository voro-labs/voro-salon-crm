
import { MediaItem, Genre } from "../types"
import { APIResult, AnilistMediaResult } from "./types"

const ANILIST_API_URL = "https://graphql.anilist.co"

const query = `
query {
  Page(page: 1, perPage: 20) {
    media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
      id
      title {
        english
        romaji
      }
      genres
      description
      seasonYear
      coverImage {
        large
      }
      averageScore
    }
  }
}
`

function mapAnime(item: AnilistMediaResult): MediaItem {
  const year = item.seasonYear || 2024
  let era: MediaItem["era"] = "2020+"
  if (year < 1980) era = "1970s"
  else if (year < 1990) era = "1980s"
  else if (year < 2000) era = "1990s"
  else if (year < 2010) era = "2000s"
  else if (year < 2020) era = "2010s"

  // Map AniList genres to our internal types
  // This is a simplification; ideally we'd have a robust mapper
  const genres = item.genres.slice(0, 3) as Genre[]

  return {
    id: `anime-${item.id}`,
    title: item.title.english || item.title.romaji,
    year,
    type: "anime",
    genres: genres.length > 0 ? genres : ["Fantasy"],
    description: item.description?.replace(/<[^>]*>?/gm, "") || "", // Strip HTML
    cover: item.coverImage.large,
    era,
    keywords: [],
  }
}

export async function getTrendingAnime(page: number = 1): Promise<APIResult> {
  const query = `
  query {
    Page(page: ${page}, perPage: 20) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title {
          english
          romaji
        }
        genres
        description
        seasonYear
        coverImage {
          large
        }
        averageScore
      }
    }
  }
  `

  try {
    const res = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query })
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch anime: ${res.status} ${text}`)
    }

    const data = await res.json()
    
    if (data.errors) {
       throw new Error(`AniList GraphQL Error: ${JSON.stringify(data.errors)}`)
    }

    const items = data.data.Page.media.map(mapAnime)
    return { items }
  } catch (error) {
    console.error("AniList API Error:", error)
    return { items: [], error: "Failed to fetch anime" }
  }
}
