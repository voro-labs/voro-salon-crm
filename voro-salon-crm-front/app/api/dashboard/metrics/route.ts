import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

function getTenantId(request: NextRequest) {
  return request.headers.get("x-tenant-id") || ""
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantId(request)
    const sql = getDb()

    // Current month metrics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [monthlyRevenue] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM services
      WHERE tenant_id = ${tenantId}
        AND service_date >= ${startOfMonth}
        AND service_date <= ${endOfMonth}
    `

    const [clientCount] = await sql`
      SELECT COUNT(*) as count FROM clients WHERE tenant_id = ${tenantId}
    `

    // Revenue last 6 months for chart
    const revenueByMonth = await sql`
      SELECT
        TO_CHAR(service_date, 'YYYY-MM') as month,
        TO_CHAR(service_date, 'Mon') as month_label,
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM services
      WHERE tenant_id = ${tenantId}
        AND service_date >= (NOW() - INTERVAL '6 months')
      GROUP BY TO_CHAR(service_date, 'YYYY-MM'), TO_CHAR(service_date, 'Mon')
      ORDER BY month ASC
    `

    // Top clients by revenue
    const topClients = await sql`
      SELECT c.name, COUNT(s.id) as service_count, COALESCE(SUM(s.amount), 0) as total_spent
      FROM clients c
      LEFT JOIN services s ON s.client_id = c.id AND s.tenant_id = ${tenantId}
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.id, c.name
      ORDER BY total_spent DESC
      LIMIT 5
    `

    return NextResponse.json({
      monthlyRevenue: Number(monthlyRevenue.total),
      monthlyServiceCount: Number(monthlyRevenue.count),
      totalClients: Number(clientCount.count),
      revenueByMonth,
      topClients,
    })
  } catch (error) {
    console.error("Metrics error:", error)
    return NextResponse.json({ error: "Erro ao buscar metricas" }, { status: 500 })
  }
}
