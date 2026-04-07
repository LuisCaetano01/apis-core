/**
 * JWT HS256 (`jose`): assinatura com `JWT_SECRET`; validação sem estado de sessão no servidor.
 * Claims usados: `sub` (id do utilizador), `email`.
 */
import { SignJWT, jwtVerify } from "jose";

/** Lê o segredo do ambiente; tem de ser longo para a assinatura ser segura. */
function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
  }
  return new TextEncoder().encode(s);
}

/**
 * Cria um JWT após login (ou outro fluxo de confiança).
 *
 * @param {{ sub: string, email: string }} payload `sub` = id do utilizador (string), `email` opcional conforme fluxo
 * @param {string} [expiresIn] ex.: "7d", "24h"
 */
export async function signAuthToken(payload, expiresIn = "7d") {
  const secret = getSecret();
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Valida o token e devolve id + email. Lança se o token for inválido ou expirado.
 *
 * @returns {{ id: number, email: string }}
 */
export async function verifyAuthToken(token) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const sub = payload.sub;
  if (typeof sub !== "string") throw new Error("Invalid token");
  const id = Number.parseInt(sub, 10);
  if (!Number.isFinite(id) || id < 1) throw new Error("Invalid token");
  const email = typeof payload.email === "string" ? payload.email : "";
  return { id, email };
}
