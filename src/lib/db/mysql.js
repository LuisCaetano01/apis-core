/**
 * Pool `mysql2/promise`: reutiliza ligações TCP entre pedidos à API.
 * Credenciais: `MYSQL_*` no ambiente.
 * `namedPlaceholders: true`: placeholders nomeados (`:uid`, …) nas queries.
 */
import mysql from "mysql2/promise";
import { getMysqlSslFromEnv } from "./mysql-ssl";

/** Instância única (singleton), criada na primeira chamada a getMysqlPool(). */
let pool;

/**
 * Devolve o pool partilhado (Route Handlers em runtime Node.js).
 * Falha cedo se MYSQL_USER ou MYSQL_DATABASE estiverem em falta.
 */
export function getMysqlPool() {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST ?? "127.0.0.1";
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE;

  if (!user || !database) {
    throw new Error(
      "MYSQL_USER e MYSQL_DATABASE têm de estar definidos no ambiente."
    );
  }

  const ssl = getMysqlSslFromEnv();

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    ...(ssl ? { ssl } : {}),
  });

  return pool;
}
