import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const hostname = headersList.get("host")?.split(":")[0] ?? "salon-crm.vorolabs.app"
  const baseUrl = `https://${hostname}`

  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/prices`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ]
}
