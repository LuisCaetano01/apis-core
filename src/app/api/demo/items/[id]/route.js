/**
 * `/api/demo/items/[id]`: PATCH e DELETE sobre uma linha de `demo_items`.
 *
 * Autorização: `WHERE id = :id AND user_id = :uid` com `uid` do JWT; sem correspondência, 404.
 * `params` do App Router pode ser Promise; usar `await params`.
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { requireUser } from "@/lib/auth/request-auth";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

/**
 * PATCH: atualização parcial (`title` / `content`). Cláusula `SET` montada com placeholders nomeados
 * (sem concatenar input na SQL).
 */
export async function PATCH(request, { params }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id) || id < 1) {
    return json({ error: "id inválido." }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 255) : undefined;
  const content =
    body.content === null
      ? null
      : typeof body.content === "string"
        ? body.content
        : undefined;

  if (title === undefined && content === undefined) {
    return json({ error: "Envia title e/ou content." }, 400);
  }

  if (title !== undefined && !title) {
    return json({ error: "title não pode ser vazio." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const sets = [];
    const args = { id, uid: auth.user.id };

    if (title !== undefined) {
      sets.push("title = :title");
      args.title = title;
    }
    if (content !== undefined) {
      sets.push("content = :content");
      args.content = content;
    }

    const [result] = await pool.execute(
      `UPDATE demo_items SET ${sets.join(", ")} WHERE id = :id AND user_id = :uid`,
      args
    );

    if (result.affectedRows === 0) {
      return json({ error: "Item não encontrado ou sem permissão." }, 404);
    }

    const [rows] = await pool.execute(
      `SELECT id, user_id, title, content, created_at, updated_at FROM demo_items WHERE id = :id AND user_id = :uid`,
      { id, uid: auth.user.id }
    );
    return json({ item: rows[0] });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao atualizar item." }, 500);
  }
}

/** DELETE: remove a linha se existir e `user_id` coincidir com o JWT; id só no path. */
export async function DELETE(request, { params }) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await params;
  const id = Number.parseInt(idParam, 10);
  if (!Number.isFinite(id) || id < 1) {
    return json({ error: "id inválido." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const [result] = await pool.execute(
      `DELETE FROM demo_items WHERE id = :id AND user_id = :uid`,
      { id, uid: auth.user.id }
    );
    if (result.affectedRows === 0) {
      return json({ error: "Item não encontrado ou sem permissão." }, 404);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao apagar item." }, 500);
  }
}
