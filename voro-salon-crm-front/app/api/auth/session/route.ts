import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getTenantById } from "@/lib/tenant"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const sql = getDb()
    const user = await sql`SELECT id, name, email, role FROM users WHERE id = ${session.userId}`
    const tenant = await getTenantById(session.tenantId)

    return NextResponse.json({ user: user[0], tenant })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
