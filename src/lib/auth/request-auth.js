/**
 * Extrai e valida JWT em API Routes.
 * Cabeçalho esperado: `Authorization: Bearer <token>` (prefixo de 7 caracteres removido antes da verificação).
 */
import { verifyAuthToken } from "./jwt";

function getBearerToken(request) {
  const h = request.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
}

/**
 * Rotas protegidas: sem Bearer → 401; token inválido/expirado → 401; caso contrário `{ ok: true, user }`.
 *
 * @returns {Promise<{ ok: true, user: { id: number, email: string } } | { ok: false, response: Response }>}
 */
export async function requireUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: Response.json(
        { error: "Autenticação necessária (Authorization: Bearer <token>)." },
        { status: 401 }
      ),
    };
  }
  try {
    const user = await verifyAuthToken(token);
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Token inválido ou expirado." },
        { status: 401 }
      ),
    };
  }
}
