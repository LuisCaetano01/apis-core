/** Página `/configuracoes-vercel`: checklist de variáveis e deploy (conteúdo em `VercelOnlineConfigContent`). */
import { AppTopNav } from "@/components/app-top-nav";
import { VercelOnlineConfigContent } from "@/components/vercel-online-config-content";

export default function ConfiguracoesVercelPage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppTopNav className="sticky top-0 z-30" />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Configurações Vercel (online)
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Guia para configurar o projeto na Vercel e ligar à base MySQL (ex.: Aiven).
        </p>
      </header>

      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-900/40">
        <VercelOnlineConfigContent />
      </section>
      </div>
    </div>
  );
}
