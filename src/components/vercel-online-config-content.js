/**
 * Lista de variáveis de ambiente e notas para deploy Vercel (componente reutilizável).
 */
export function VercelOnlineConfigContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Checklist para o deploy não falhar. No projeto Vercel:{" "}
        <strong className="text-slate-900 dark:text-slate-100">
          Settings → Environment Variables
        </strong>
        , e define para <strong>Production</strong> (e Preview, se aplicável).
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-slate-700 marker:text-slate-500 dark:text-slate-300 dark:marker:text-slate-500">
        <li>
          <strong className="text-slate-900 dark:text-slate-100">MySQL:</strong>{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_HOST
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_PORT
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_USER
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_PASSWORD
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_DATABASE
          </code>{" "}
          (iguais à Aiven / à tua base).
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">SSL:</strong>{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            MYSQL_SSL_CA_PEM_BASE64
          </code>
          , certificado CA em <strong>uma linha</strong> Base64 (usa o conversor no dashboard ou o
          valor do teu <code className="text-xs">.env</code>).
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">JWT:</strong>{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            JWT_SECRET
          </code>{" "}
          com <strong>mínimo 32 caracteres</strong> (gera um segredo novo para produção).
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">Registo:</strong>{" "}
          <code className="rounded bg-slate-200/80 px-1 text-xs dark:bg-slate-800">
            AUTH_ALLOW_REGISTER
          </code>
          = <code className="text-xs">false</code> em produção, salvo necessidade explícita.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">Base de dados:</strong> corre as
          migrações na base <strong>antes</strong> da app depender delas (local ou CI:{" "}
          <code className="text-xs">npm run db:migrate</code> e{" "}
          <code className="text-xs">npm run db:migrate-demo</code>). O deploy da Vercel{" "}
          <strong>não</strong> corre estes scripts sozinho.
        </li>
        <li>
          <strong className="text-slate-900 dark:text-slate-100">Rede Aiven:</strong> permite
          ligações de saída do hosting (IPs da Vercel são dinâmicos; ajusta o filtro de IP / rede na
          Aiven conforme a documentação deles para serverless).
        </li>
      </ul>
    </div>
  );
}
