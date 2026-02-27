import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request)
    const sql = getDb()

    const clients = await sql`
      SELECT c.name, c.phone, c.notes, c.created_at,
        (SELECT MAX(s.service_date) FROM services s WHERE s.client_id = c.id) as last_service,
        (SELECT COUNT(*) FROM services s WHERE s.client_id = c.id) as service_count,
        (SELECT COALESCE(SUM(s.amount), 0) FROM services s WHERE s.client_id = c.id) as total_spent
      FROM clients c
      WHERE c.tenant_id = ${tenantId}
      ORDER BY c.name ASC
    `

    // Build CSV
    const headers = ["Nome", "Telefone", "Observacoes", "Cadastro", "Ultimo Servico", "Total Servicos", "Total Gasto"]
    const rows = clients.map((c) => [
      c.name,
      c.phone,
      (c.notes || "").replace(/"/g, '""'),
      new Date(c.created_at).toLocaleDateString("pt-BR"),
      c.last_service ? new Date(c.last_service).toLocaleDateString("pt-BR") : "Nenhum",
      c.service_count,
      `R$ ${Number(c.total_spent).toFixed(2)}`,
    ])

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clientes-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export clients error:", error)
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 })
  }
}
