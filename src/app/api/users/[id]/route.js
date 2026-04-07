/**
 * `/api/users/[id]`: PATCH e DELETE sobre `auth_users`.
 *
 * O `id` do URL tem de igualar `auth.user.id` do JWT (403 caso contrário).
 * PATCH/DELETE exigem `current_password` no corpo. Sem papel admin: só o próprio registo.
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/request-auth";
import { signAuthToken } from "@/lib/auth/jwt";

/** Respostas JSON com código HTTP explícito (padrão nas API Routes deste projeto). */
export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

/**
 * PATCH: atualiza `auth_users` (email e/ou password). Exige `current_password`.
 * Emite novo JWT se alteração for bem-sucedida.
 */
export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await params;
  const targetId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(targetId) || targetId < 1) {
    return json({ error: "id inválido." }, 400);
  }

  if (targetId !== auth.user.id) {
    return json(
      { error: "Só podes alterar o teu próprio perfil (id no URL deve ser o teu)." },
      403
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const current_password =
    typeof body.current_password === "string" ? body.current_password : "";
  const newEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const newPassword = typeof body.password === "string" ? body.password : undefined;

  if (!current_password) {
    return json(
      { error: "current_password é obrigatório para alterar o perfil." },
      400
    );
  }

  if (newEmail === undefined && newPassword === undefined) {
    return json({ error: "Envia email e/ou password novos." }, 400);
  }

  if (newPassword !== undefined && newPassword.length < 8) {
    return json(
      { error: "A nova password deve ter pelo menos 8 caracteres." },
      400
    );
  }

  if (
    newEmail !== undefined &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
  ) {
    return json({ error: "Email inválido." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT id, email, password_hash FROM auth_users WHERE id = :id LIMIT 1`,
      { id: targetId }
    );
    const row = rows[0];
    if (!row) {
      return json({ error: "Utilizador não encontrado." }, 404);
    }

    const pwdOk = await verifyPassword(current_password, row.password_hash);
    if (!pwdOk) {
      return json({ error: "Password atual incorreta." }, 401);
    }

    const emailToSet = newEmail !== undefined ? newEmail : row.email;
    const passwordHashToSet =
      newPassword !== undefined
        ? await hashPassword(newPassword)
        : row.password_hash;

    await pool.execute(
      `UPDATE auth_users SET email = :email, password_hash = :password_hash WHERE id = :id`,
      {
        email: emailToSet,
        password_hash: passwordHashToSet,
        id: targetId,
      }
    );

    const token = await signAuthToken({
      sub: String(targetId),
      email: emailToSet,
    });

    return json({
      user: { id: targetId, email: emailToSet },
      token,
    });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return json({ error: "Este email já está em uso." }, 409);
    }
    if (e.message?.includes("JWT_SECRET")) {
      return json({ error: "Servidor mal configurado (JWT_SECRET)." }, 500);
    }
    console.error(e);
    return json({ error: "Erro ao atualizar perfil." }, 500);
  }
}

/**
 * DELETE: remove a linha em `auth_users`; os `demo_items` ligados caem pela FK ON DELETE CASCADE.
 */
export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await params;
  const targetId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(targetId) || targetId < 1) {
    return json({ error: "id inválido." }, 400);
  }

  if (targetId !== auth.user.id) {
    return json(
      { error: "Só podes apagar o teu próprio utilizador (id no URL deve ser o teu)." },
      403
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const current_password =
    typeof body.current_password === "string" ? body.current_password : "";
  if (!current_password) {
    return json(
      { error: "current_password é obrigatório para apagar a conta." },
      400
    );
  }

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT password_hash FROM auth_users WHERE id = :id LIMIT 1`,
      { id: targetId }
    );
    const row = rows[0];
    if (!row) {
      return json({ error: "Utilizador não encontrado." }, 404);
    }

    const pwdOk = await verifyPassword(current_password, row.password_hash);
    if (!pwdOk) {
      return json({ error: "Password atual incorreta." }, 401);
    }

    await pool.execute(`DELETE FROM auth_users WHERE id = :id`, {
      id: targetId,
    });

    return json({ ok: true, message: "Conta apagada.", id: targetId });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao apagar conta." }, 500);
  }
}
