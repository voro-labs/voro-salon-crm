import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { clientSchema } from "@/lib/validations"

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

    const rows = await sql`
      SELECT c.*,
        (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id) as service_count,
        (SELECT COALESCE(SUM(s.amount), 0) FROM services s WHERE s.client_id = c.id) as total_spent
      FROM clients c
      WHERE c.id = ${id} AND c.tenant_id = ${tenantId}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ client: rows[0] })
  } catch (error) {
    console.error("Client GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params
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
      UPDATE clients
      SET name = ${name}, phone = ${phone}, notes = ${notes || ""}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("Client PUT error:", error)
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params
    const sql = getDb()

    // Delete services first (cascade)
    await sql`DELETE FROM services WHERE client_id = ${id} AND tenant_id = ${tenantId}`
    const rows = await sql`
      DELETE FROM clients WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING id
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Client DELETE error:", error)
    return NextResponse.json({ error: "Erro ao excluir cliente" }, { status: 500 })
  }
}
