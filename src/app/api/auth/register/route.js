/**
 * `POST /api/auth/register`: insere linha em `auth_users` (password com bcrypt).
 *
 * Ativo só com `AUTH_ALLOW_REGISTER=true`; senão 403.
 * Validação: email, password ≥ 8, unicidade de email (`ER_DUP_ENTRY` → 409).
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

function allowRegister() {
  return process.env.AUTH_ALLOW_REGISTER === "true";
}

export async function POST(request) {
  if (!allowRegister()) {
    return json({ error: "Registo desativado." }, 403);
  }

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

  if (password.length < 8) {
    return json({ error: "A password deve ter pelo menos 8 caracteres." }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Email inválido." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const password_hash = await hashPassword(password);

    const [result] = await pool.execute(
      `INSERT INTO auth_users (email, password_hash) VALUES (:email, :password_hash)`,
      { email, password_hash }
    );

    const id = result.insertId;

    return json(
      {
        message: "Utilizador criado.",
        user: { id, email },
      },
      201
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return json({ error: "Este email já está registado." }, 409);
    }
    if (e.message?.includes("MYSQL_USER")) {
      return json({ error: "Servidor mal configurado (MySQL)." }, 500);
    }
    console.error(e);
    return json({ error: "Erro interno." }, 500);
  }
}
