import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getTenantById, updateTenant } from "@/lib/tenant"
import { tenantSettingsSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const tenant = await getTenantById(session.tenantId)
    return NextResponse.json(tenant)
  } catch (error) {
    console.error("Tenant GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar configuracoes" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = tenantSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const updated = await updateTenant(session.tenantId, parsed.data)
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Tenant PUT error:", error)
    return NextResponse.json({ error: "Erro ao atualizar configuracoes" }, { status: 500 })
  }
}
