/**
 * Opções SSL para `mysql2`: CA em `MYSQL_SSL_CA_PEM_BASE64` (PEM em Base64, uma linha; deploy sem ficheiros PEM no disco).
 * Se a variável estiver vazio, retorna `undefined` (ligação sem TLS; apenas desenvolvimento local adequado).
 */
export function getMysqlSslFromEnv() {
  const b64 = process.env.MYSQL_SSL_CA_PEM_BASE64;
  if (!b64?.trim()) return undefined;
  const ca = Buffer.from(b64.trim(), "base64").toString("utf8");
  return { ca, rejectUnauthorized: true };
}
