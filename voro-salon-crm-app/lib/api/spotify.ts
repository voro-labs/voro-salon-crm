
import { MediaItem, Genre } from "../types"
import { APIResult, SpotifyTrackResult } from "./types"

const SPOTIFY_CLIENT_TOKEN = process.env.SPOTIFY_CLIENT_TOKEN
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const AUTH_URL = "https://accounts.spotify.com/api/token"
const BASE_URL = "https://api.spotify.com/v1"

let accessToken: string | null = null
let tokenExpiry = 0

async function getAccessToken() {
  if (!SPOTIFY_CLIENT_TOKEN && !SPOTIFY_CLIENT_ID) return null
  if (accessToken && Date.now() < tokenExpiry) return accessToken

  let authHeader = ""
  if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_TOKEN) {
     // User provided ID and Token (likely Secret), so we encode them
     const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_TOKEN}`).toString("base64")
     authHeader = `Basic ${creds}`
  } else if (SPOTIFY_CLIENT_TOKEN) {
     // Existing behavior: Token is assumed to be the full base64 string
     authHeader = `Basic ${SPOTIFY_CLIENT_TOKEN}`
  }

  try {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to get Spotify token: ${res.status} ${text}`)
    }

    const data = await res.json()
    accessToken = data.access_token
    tokenExpiry = Date.now() + data.expires_in * 1000
    return accessToken
  } catch (error) {
    console.error("Spotify Auth Error:", error)
    return null
  }
}

function mapTrack(item: SpotifyTrackResult): MediaItem {
  // Map Spotify genres if available (usually on artist, not track), simplify for now
  const year = parseInt(item.album.release_date.split("-")[0])
  let era: MediaItem["era"] = "2020+"
  if (year < 1980) era = "1970s"
  else if (year < 1990) era = "1980s"
  else if (year < 2000) era = "1990s"
  else if (year < 2010) era = "2000s"
  else if (year < 2020) era = "2010s"

  return {
    id: `song-${item.id}`,
    title: item.name,
    year,
    type: "song",
    genres: ["Pop"], // Defaulting to Pop as tracks don't have genres directly
    description: `Song by ${item.artists.map((a) => a.name).join(", ")}`,
    cover: item.album.images[0]?.url || "",
    era,
    keywords: item.artists.map((a) => a.name),
  }
}

export async function getRecommendedTracks(page: number = 1): Promise<APIResult> {
  const token = await getAccessToken()
  if (!token) return { items: [], error: "Missing Spotify Credentials" }

  const offset = (page - 1) * 20

  try {
    // Fetch from a popular playlist (e.g., Global Top 50)
    // Playlist ID: 37i9dQZEVXbMDoHDwVN2tF
    const res = await fetch(
      `${BASE_URL}/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?limit=20&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (!res.ok) throw new Error("Failed to fetch tracks")

    const data = await res.json()
    const items = data.items
      .map((i: any) => i.track)
      .filter((t: any) => t && t.preview_url) // Only tracks with preview? Maybe not strictly necessary for swipe card
      .map(mapTrack)

    return { items }
  } catch (error) {
    console.error("Spotify API Error:", error)
    return { items: [], error: "Failed to fetch tracks" }
  }
}
