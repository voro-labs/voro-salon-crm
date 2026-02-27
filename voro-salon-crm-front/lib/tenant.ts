import { getDb } from "./db"

export interface Tenant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  contact_phone: string | null
  contact_email: string | null
  theme_mode: string
  created_at: string
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM tenants WHERE id = ${tenantId} LIMIT 1`
  return (rows[0] as Tenant) || null
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM tenants WHERE slug = ${slug} LIMIT 1`
  return (rows[0] as Tenant) || null
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Omit<Tenant, "id" | "slug" | "created_at">>
): Promise<Tenant | null> {
  const sql = getDb()
  const rows = await sql`
    UPDATE tenants SET
      name = COALESCE(${data.name ?? null}, name),
      logo_url = COALESCE(${data.logo_url ?? null}, logo_url),
      primary_color = COALESCE(${data.primary_color ?? null}, primary_color),
      secondary_color = COALESCE(${data.secondary_color ?? null}, secondary_color),
      contact_phone = COALESCE(${data.contact_phone ?? null}, contact_phone),
      contact_email = COALESCE(${data.contact_email ?? null}, contact_email),
      theme_mode = COALESCE(${data.theme_mode ?? null}, theme_mode)
    WHERE id = ${tenantId}
    RETURNING *
  `
  return (rows[0] as Tenant) || null
}

export async function getAllTenantSlugs(): Promise<{ slug: string; name: string }[]> {
  const sql = getDb()
  const rows = await sql`SELECT slug, name FROM tenants ORDER BY name`
  return rows as { slug: string; name: string }[]
}
