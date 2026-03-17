
import { MediaItem } from "../types"
import { APIResult, GoogleBookResult } from "./types"

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY
const BASE_URL = "https://www.googleapis.com/books/v1/volumes"

function mapBook(item: GoogleBookResult): MediaItem {
  const year = parseInt(item.volumeInfo.publishedDate?.split("-")[0] || "2024")
  let era: MediaItem["era"] = "2020+"
  if (year < 1980) era = "1970s"
  else if (year < 1990) era = "1980s"
  else if (year < 2000) era = "1990s"
  else if (year < 2010) era = "2000s"
  else if (year < 2020) era = "2010s"

  return {
    id: `book-${item.id}`,
    title: item.volumeInfo.title,
    year,
    type: "book",
    genres: ["Drama"], // Defaulting
    description: item.volumeInfo.description || "",
    cover: item.volumeInfo.imageLinks?.thumbnail.replace("http:", "https:") || "",
    era,
    keywords: item.volumeInfo.categories || [],
  }
}

export async function getTrendingBooks(page: number = 1): Promise<APIResult> {
  // Uses public subject "fiction" ordered by relevance/newest
  const apiKeyPart = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ""
  const startIndex = (page - 1) * 20
  try {
    let res = await fetch(
      `${BASE_URL}?q=subject:fiction&orderBy=newest&maxResults=20&startIndex=${startIndex}${apiKeyPart}`
    )

    // Retry without key if 400 (Invalid Key)
    if (!res.ok && res.status === 400 && apiKeyPart) {
        console.warn("Google Books API Key invalid, retrying without key...")
        res = await fetch(
            `${BASE_URL}?q=subject:fiction&orderBy=newest&maxResults=20&startIndex=${startIndex}`
        )
    }

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch books: ${res.status} ${text}`)
    }

    const data = await res.json()
    const items = (data.items || []).map(mapBook)
    return { items }
  } catch (error) {
    console.error("Google Books API Error:", error)
    return { items: [], error: "Failed to fetch books" }
  }
}
