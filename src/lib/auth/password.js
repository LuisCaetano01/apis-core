/**
 * bcrypt (unidirecional): em vazamento da BD obtêm-se apenas hashes; verificação no login com `compare`.
 * `ROUNDS` (12) fixo em todo o código que gera ou valida hashes.
 */
import bcrypt from "bcryptjs";

/** Custo do bcrypt (2^12 iterações internas); alinhado com scripts/auth-create-user.mjs */
const ROUNDS = 12;

/** Gera hash a partir da password em texto claro (ex.: ao registar utilizador). */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

/** Compara password do login com o hash guardado em auth_users.password_hash. */
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
