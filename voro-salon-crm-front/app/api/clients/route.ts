import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { clientSchema } from "@/lib/validations"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sql = getDb()

    let clients
    if (search) {
      const pattern = `%${search}%`
      clients = await sql`
        SELECT c.*,
          (SELECT MAX(s.service_date) FROM services s WHERE s.client_id = c.id) as last_service_date,
          (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id) as services_count
        FROM clients c
        WHERE c.tenant_id = ${tenantId}
          AND (c.name ILIKE ${pattern} OR c.phone ILIKE ${pattern})
        ORDER BY last_service_date DESC NULLS LAST, c.name ASC
      `
    } else {
      clients = await sql`
        SELECT c.*,
          (SELECT MAX(s.service_date) FROM services s WHERE s.client_id = c.id) as last_service_date,
          (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id) as services_count
        FROM clients c
        WHERE c.tenant_id = ${tenantId}
        ORDER BY last_service_date DESC NULLS LAST, c.name ASC
      `
    }

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Clients GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantId(request)
    const body = await request.json()
    const parsed = clientSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, phone, notes } = parsed.data
    const sql = getDb()

    const rows = await sql`
      INSERT INTO clients (tenant_id, name, phone, notes)
      VALUES (${tenantId}, ${name}, ${phone}, ${notes || ""})
      RETURNING *
    `

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error("Clients POST error:", error)
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
  }
}
