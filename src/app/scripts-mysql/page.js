/**
 * Server Component: lê `database/*.sql` em build e mostra o conteúdo (referência; não executa SQL no servidor).
 */
import { AppTopNav } from "@/components/app-top-nav";
import { readFile } from "node:fs/promises";
import path from "node:path";

const FILES = [
  {
    filename: "create_database_apis_core.sql",
    title: "Criar base de dados apis-core",
    hint: "1.º passo: executa com um utilizador com privilégio CREATE. Cria só a base `apis-core` (utf8mb4). Depois corre o setup completo ou os scripts seguintes.",
  },
  {
    filename: "mysql_setup_completo.sql",
    title: "Setup completo (base + tabelas + utilizador demo)",
    hint: "Podes correr sozinho: inclui CREATE DATABASE `apis-core`, tabelas e utilizador teste@teste.pt (password: teste). Se já criaste a base com o script acima, também é seguro (IF NOT EXISTS).",
  },
  {
    filename: "auth_users_schema.sql",
    title: "auth_users (só tabela de utilizadores)",
    hint: "Depois de criares a base com o 1.º script. Corre na base `apis-core` já existente.",
  },
  {
    filename: "demo_items_schema.sql",
    title: "demo_items (CRUD demo)",
    hint: "Depois de auth_users (foreign key para auth_users).",
  },
  {
    filename: "auth_seed_first_user.sql",
    title: "Utilizador demo (teste@teste.pt)",
    hint: "Insere ou atualiza utilizador de teste (password: teste, bcrypt 12). Executar após `auth_users` existir. Alternativa: npm run db:seed-demo-user.",
  },
];

async function loadSql(filename) {
  const full = path.join(process.cwd(), "database", filename);
  return readFile(full, "utf-8");
}

export default async function ScriptsMysqlPage() {
  const contents = await Promise.all(
    FILES.map(async (meta) => ({
      ...meta,
      sql: await loadSql(meta.filename).catch(() => null),
    }))
  );

  return (
    <div className="flex min-h-full flex-col">
      <AppTopNav className="sticky top-0 z-30" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Scripts MySQL
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Ficheiros em <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">database/</code>
          . Começa pelo script que <strong className="text-zinc-800 dark:text-zinc-200">cria a base apis-core</strong>
          ; em seguida usa o setup completo ou os scripts parciais (auth_users → demo_items → seed) na mesma
          ordem.
        </p>
      </header>

      <div className="space-y-8">
        {contents.map((block) => (
          <section
            key={block.filename}
            className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-6 dark:border-cyan-900/50 dark:bg-cyan-950/25"
          >
            <h2 className="text-base font-semibold text-cyan-950 dark:text-cyan-100">
              {block.title}
            </h2>
            <p className="mt-1 text-sm text-cyan-900/90 dark:text-cyan-200/85">{block.hint}</p>
            <p className="mt-2 font-mono text-xs text-cyan-800/90 dark:text-cyan-300/90">
              database/{block.filename}
            </p>
            {block.sql ? (
              <pre className="mt-4 max-h-[min(480px,70vh)] overflow-auto whitespace-pre-wrap rounded-xl border border-cyan-200/80 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-900 shadow-inner dark:border-cyan-900/40 dark:bg-zinc-950 dark:text-zinc-100">
                {block.sql}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
                Não foi possível ler o ficheiro no servidor.
              </p>
            )}
          </section>
        ))}
      </div>
      </div>
    </div>
  );
}
