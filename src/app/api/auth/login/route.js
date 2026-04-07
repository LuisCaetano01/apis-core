/**
 * `POST /api/auth/login`: email + password → JWT (`sub` = id em `auth_users`).
 *
 * Passos: JSON body → lookup por email (minúsculas) → `verifyPassword` (bcrypt) → `signAuthToken`.
 * Resposta não cacheável (`force-dynamic`): depende de credenciais.
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return json({ error: "email e password são obrigatórios." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT id, email, password_hash FROM auth_users WHERE email = :email LIMIT 1`,
      { email }
    );

    const user = rows[0];
    // Mensagem genérica "Credenciais inválidas" evita revelar se o email existe (segurança).
    if (!user) {
      return json({ error: "Credenciais inválidas." }, 401);
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return json({ error: "Credenciais inválidas." }, 401);
    }

    const token = await signAuthToken({
      sub: String(user.id),
      email: user.email,
    });

    return json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    if (e.message?.includes("JWT_SECRET")) {
      return json({ error: "Servidor mal configurado (JWT_SECRET)." }, 500);
    }
    if (e.message?.includes("MYSQL_USER")) {
      return json({ error: "Servidor mal configurado (MySQL)." }, 500);
    }
    console.error(e);
    return json({ error: "Erro interno." }, 500);
  }
}
