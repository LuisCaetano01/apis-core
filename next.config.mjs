/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["swagger-ui-react"],
  /**
   * O pacote `swagger-ui-react` ainda inclui class components com
   * `UNSAFE_componentWillReceiveProps` (ex.: ModelCollapse). Com React 19 + Strict Mode
   * ativo, o devtools mostra avisos em loop; não é bug da nossa app.
   * Ver: https://github.com/swagger-api/swagger-ui/issues/10243
   * Quando o Swagger UI atualizar, volta a pôr `true` para recuperar verificações extra em dev.
   */
  reactStrictMode: false,
};

export default nextConfig;
