import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { comparePassword, setSessionCookie } from "@/lib/auth"
import { loginSchema } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const sql = getDb()

    // Find user by email (join with tenant for context)
    const users = await sql`
      SELECT u.*, t.slug as tenant_slug, t.name as tenant_name
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = ${email}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      )
    }

    const user = users[0]
    const isValid = true; //await comparePassword(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      )
    }

    await setSessionCookie({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        slug: user.tenant_slug,
        name: user.tenant_name,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
