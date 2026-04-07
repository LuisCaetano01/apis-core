/**
 * `/dashboard`: conversão PEM→Base64 (ex.: variável Vercel), links. Sem `auth_token` → `router.replace('/login')`.
 * `fileToBase64`: `FileReader` + `btoa` no browser (sem upload ao servidor).
 */
"use client";

import { AppTopNav } from "@/components/app-top-nav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Converte um File (input type=file) para string Base64, no browser. */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (!(buf instanceof ArrayBuffer)) {
        reject(new Error("Leitura inválida."));
        return;
      }
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(i, Math.min(i + chunk, bytes.length))
        );
      }
      resolve(btoa(binary));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.readAsArrayBuffer(file);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const [caB64, setCaB64] = useState("");
  const [caFileName, setCaFileName] = useState("");
  const [caError, setCaError] = useState("");
  const [caLoading, setCaLoading] = useState(false);
  const [caCopied, setCaCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    //if (!localStorage.getItem("auth_token")) {
    //  router.replace("/login");
    //  return;
    //}
    queueMicrotask(() => setReady(true));
  }, [router]);

  const onCaFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCaError("");
    setCaB64("");
    setCaFileName(file.name);
    setCaLoading(true);
    try {
      const b64 = await fileToBase64(file);
      setCaB64(b64);
    } catch (err) {
      setCaError(err instanceof Error ? err.message : "Erro ao processar.");
    } finally {
      setCaLoading(false);
    }
  }, []);

  async function copyCaB64() {
    if (!caB64 || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(caB64);
      setCaCopied(true);
      window.setTimeout(() => setCaCopied(false), 2500);
    } catch {
      setCaCopied(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center text-zinc-500">
        A carregar…
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppTopNav className="sticky top-0 z-30" />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            SSL (ca.pem) converter
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Sessão iniciada.</p>
        </header>

      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6 dark:border-violet-900/50 dark:bg-violet-950/30">
        <h2 className="text-base font-semibold text-violet-950 dark:text-violet-100">
          CA SSL → Base64 (Vercel)
        </h2>
        <p className="mt-2 text-sm text-violet-900/90 dark:text-violet-200/90">
          Carrega o ficheiro <strong>ca.pem</strong> (ex.: da Aiven). O Base64 é gerado{" "}
          <strong>só no teu browser</strong>. O ficheiro não é enviado ao servidor. Cola o
          resultado na variável{" "}
          <code className="rounded bg-violet-100 px-1 text-xs dark:bg-violet-900/70">
            MYSQL_SSL_CA_PEM_BASE64
          </code>{" "}
          na Vercel (uma linha, sem espaços).
        </p>

        <label className="mt-4 flex cursor-pointer flex-col gap-2">
          <span className="text-sm font-medium text-violet-900 dark:text-violet-200">
            Escolher ficheiro (.pem)
          </span>
          <input
            type="file"
            accept=".pem,.crt,.cer,text/plain,*/*"
            onChange={onCaFile}
            className="text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-700 dark:text-zinc-300 dark:file:bg-violet-500"
          />
        </label>

        {caLoading ? (
          <p className="mt-3 text-sm text-violet-700 dark:text-violet-300">A processar…</p>
        ) : null}
        {caError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {caError}
          </p>
        ) : null}
        {caFileName && caB64 ? (
          <p className="mt-2 text-xs text-violet-700/80 dark:text-violet-300/80">
            Ficheiro: {caFileName}
          </p>
        ) : null}

        {caB64 ? (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
                Base64 (copiar para a Vercel)
              </span>
              <button
                type="button"
                onClick={copyCaB64}
                className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-950 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-50 dark:hover:bg-violet-900"
              >
                {caCopied ? "Copiado!" : "Copiar Base64"}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-violet-200/80 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-900 shadow-inner dark:border-violet-900/50 dark:bg-zinc-950 dark:text-zinc-100">
              {caB64}
            </pre>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
          OpenAPI (Swagger)
        </h2>
        <p className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-200/90">
          Documentação interativa e <strong>Try it out</strong> para todas as APIs (auth + demo
          CRUD). O JWT pode ser definido em <strong>Authorize</strong> ou reutilizado do login neste
          site.
        </p>
        <Link
          href="/openapi"
          className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          Abrir Swagger UI
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-900/40">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Configurações Vercel (online)
        </h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Checklist completa de variáveis de ambiente, SSL, migrações e rede (Aiven), numa página
          dedicada para consultares antes ou depois do deploy.
        </p>
        <Link
          href="/configuracoes-vercel"
          className="mt-4 inline-flex rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          Abrir Configurações Vercel (online)
        </Link>
      </section>

      <section className="rounded-2xl border border-cyan-200 bg-cyan-50/90 p-6 dark:border-cyan-900/45 dark:bg-cyan-950/30">
        <h2 className="text-base font-semibold text-cyan-950 dark:text-cyan-100">
          Scripts MySQL
        </h2>
        <p className="mt-2 text-sm text-cyan-900/90 dark:text-cyan-200/90">
          SQL de referência em <code className="rounded bg-cyan-100/90 px-1 text-xs dark:bg-cyan-900/60">database/</code>{" "}
          para criar a base nova e as tabelas <strong>auth_users</strong> e <strong>demo_items</strong>{" "}
          (script completo ou ficheiros em separado, pela ordem certa).
        </p>
        <Link
          href="/scripts-mysql"
          className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500"
        >
          Ver scripts MySQL
        </Link>
      </section>
      </div>
    </div>
  );
}
