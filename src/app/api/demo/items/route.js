/**
 * `/api/demo/items`: CRUD sobre a tabela MySQL `demo_items`.
 *
 * - `GET` / `POST` neste ficheiro: listagem e criação; filtro e `user_id` derivados do JWT.
 * - O POST não deve aceitar `user_id` no JSON como fonte de verdade; o dono da linha vem de `requireUser`.
 *
 * Rotas autenticadas: `Authorization: Bearer <JWT>`.
 */
import { getMysqlPool } from "@/lib/db/mysql";
import { requireUser } from "@/lib/auth/request-auth";

/** Respostas não devem ser cacheadas com dados de utilizador; dependem do token apresentado. */
export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status });
}

/**
 * GET: lista filtrada por `user_id` do JWT (`ORDER BY id DESC`). Sem listagem global.
 */
export async function GET(request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT id, user_id, title, content, created_at, updated_at
       FROM demo_items WHERE user_id = :uid ORDER BY id DESC`,
      { uid: auth.user.id }
    );
    return json({ items: rows });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao listar itens." }, 500);
  }
}

/**
 * POST: `INSERT` com `user_id` do JWT (não do corpo). `title` obrigatório; `content` opcional. Resposta 201.
 */
export async function POST(request) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 255) : "";
  const content =
    typeof body.content === "string" ? body.content.trim() : null;

  if (!title) {
    return json({ error: "O campo title é obrigatório." }, 400);
  }

  try {
    const pool = getMysqlPool();
    const [result] = await pool.execute(
      `INSERT INTO demo_items (user_id, title, content) VALUES (:uid, :title, :content)`,
      { uid: auth.user.id, title, content }
    );
    const id = result.insertId;
    return json(
      {
        item: {
          id,
          user_id: auth.user.id,
          title,
          content,
        },
      },
      201
    );
  } catch (e) {
    if (e.code === "ER_NO_SUCH_TABLE") {
      return json(
        { error: "Tabela demo_items inexistente. Corre npm run db:migrate-demo." },
        503
      );
    }
    console.error(e);
    return json({ error: "Erro ao criar item." }, 500);
  }
}
