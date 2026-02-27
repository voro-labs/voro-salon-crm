import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { serviceSchema } from "@/lib/validations"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params
    const sql = getDb()

    const services = await sql`
      SELECT * FROM services
      WHERE client_id = ${id} AND tenant_id = ${tenantId}
      ORDER BY service_date DESC
    `

    return NextResponse.json({ services })
  } catch (error) {
    console.error("Services GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar servicos" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params
    const body = await request.json()

    const parsed = serviceSchema.safeParse({ ...body, client_id: id })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { service_date, description, amount, notes } = parsed.data
    const sql = getDb()

    const rows = await sql`
      INSERT INTO services (tenant_id, client_id, service_date, description, amount, notes)
      VALUES (${tenantId}, ${id}, ${service_date}, ${description}, ${amount}, ${notes || ""})
      RETURNING *
    `

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error("Services POST error:", error)
    return NextResponse.json({ error: "Erro ao criar servico" }, { status: 500 })
  }
}
