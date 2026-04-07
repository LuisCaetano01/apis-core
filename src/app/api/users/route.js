/**
 * `GET /api/users`: lista `id`, `email`, `created_at` de `auth_users` (sem hashes).
 *
 * Desativado por defeito (`AUTH_ALLOW_LIST_USERS`); expõe dados sensíveis. Ativar só em ambientes controlados.
 * Requer JWT + flag; senão 401/403.
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { requireUser } from "@/lib/auth/request-auth";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

function allowListUsers() {
  return process.env.AUTH_ALLOW_LIST_USERS === "true";
}

export async function GET(request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  if (!allowListUsers()) {
    return json(
      {
        error:
          "Listagem de utilizadores desativada. Define AUTH_ALLOW_LIST_USERS=true no servidor (apenas em ambientes onde isto é aceitável).",
      },
      403
    );
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT id, email, created_at FROM auth_users ORDER BY id ASC`
    );
    return json({ users: rows });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao listar utilizadores." }, 500);
  }
}
