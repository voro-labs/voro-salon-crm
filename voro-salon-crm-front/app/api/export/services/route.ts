import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request)
    const sql = getDb()

    const services = await sql`
      SELECT s.service_date, s.description, s.amount, s.notes, c.name as client_name, c.phone as client_phone
      FROM services s
      JOIN clients c ON c.id = s.client_id
      WHERE s.tenant_id = ${tenantId}
      ORDER BY s.service_date DESC
    `

    const headers = ["Data", "Cliente", "Telefone", "Descricao", "Valor", "Observacoes"]
    const rows = services.map((s) => [
      new Date(s.service_date).toLocaleDateString("pt-BR"),
      s.client_name,
      s.client_phone,
      (s.description || "").replace(/"/g, '""'),
      `R$ ${Number(s.amount).toFixed(2)}`,
      (s.notes || "").replace(/"/g, '""'),
    ])

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="servicos-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export services error:", error)
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 })
  }
}
