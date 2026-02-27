import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { serviceSchema } from "@/lib/validations"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params
    const body = await request.json()

    // Get existing service to know client_id
    const sql = getDb()
    const existing = await sql`
      SELECT * FROM services WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: "Servico nao encontrado" }, { status: 404 })
    }

    const parsed = serviceSchema.safeParse({
      ...body,
      client_id: existing[0].client_id,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { service_date, description, amount, notes } = parsed.data

    const rows = await sql`
      UPDATE services
      SET service_date = ${service_date}, description = ${description},
          amount = ${amount}, notes = ${notes || ""}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error("Service PUT error:", error)
    return NextResponse.json({ error: "Erro ao atualizar servico" }, { status: 500 })
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

    const rows = await sql`
      DELETE FROM services WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING id
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Servico nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Service DELETE error:", error)
    return NextResponse.json({ error: "Erro ao excluir servico" }, { status: 500 })
  }
}
