/**
 * Navegação global e botão de logout quando `localStorage.auth_token` existe.
 *
 * `hasSession`: inicia a `false` no SSR e no primeiro render do cliente (hidratação); depois lê `localStorage`.
 * Evento `apis-auth-changed`: sinaliza alteração de sessão (login/logout noutras vistas).
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const navBtn =
  "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8fd4]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d14]";

function linkClass(active) {
  return active
    ? `${navBtn} border border-[#3d5f94] bg-[#2c4a7c] text-white shadow-sm hover:bg-[#325286]`
    : `${navBtn} border border-white/10 bg-white/[0.06] text-white hover:border-white/15 hover:bg-white/[0.1]`;
}

/**
 * @param {object} props
 * @param {string} [props.className] classes extra no contentor exterior
 * @param {() => void} [props.onLogout] após remover token (ex.: limpar estado em páginas com sessão em memória)
 */
export function AppTopNav({ className = "", onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  /** Estado inicial fixo para hidratação; atualizado via `syncSession`. */
  const [hasSession, setHasSession] = useState(false);

  const syncSession = useCallback(() => {
    if (typeof window === "undefined") return;
    setHasSession(Boolean(localStorage.getItem("auth_token")));
  }, []);

  useEffect(() => {
    queueMicrotask(() => syncSession());
    const onStorage = () => syncSession();
    const onAuthChange = () => syncSession();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onStorage);
    window.addEventListener("apis-auth-changed", onAuthChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
      window.removeEventListener("apis-auth-changed", onAuthChange);
    };
  }, [syncSession]);

  function handleLogout() {
    if (!window.confirm("Tens a certeza que queres terminar a sessão?")) return;
    localStorage.removeItem("auth_token");
    if (onLogout) {
      onLogout();
    } else {
      router.push("/login");
      router.refresh();
    }
    syncSession();
    window.dispatchEvent(new Event("apis-auth-changed"));
  }

  return (
    <div
      className={`border-b border-[#1a2438] bg-gradient-to-b from-[#0e1624] to-[#0a1018] ${className}`}
    >
      <nav
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-3"
        aria-label="Navegação principal"
      >
        <Link href="/demo" className={linkClass(pathname === "/demo")}>
          Demonstração CRUD
        </Link>
        <Link href="/dashboard" className={linkClass(pathname === "/dashboard")}>
          SSL (ca.pem) converter
        </Link>
        <Link href="/openapi" className={linkClass(pathname === "/openapi")}>
          OpenAPI (Swagger)
        </Link>
        <Link
          href="/configuracoes-vercel"
          className={linkClass(pathname === "/configuracoes-vercel")}
        >
          Configurações Vercel (online)
        </Link>
        <Link href="/scripts-mysql" className={linkClass(pathname === "/scripts-mysql")}>
          Scripts MySQL
        </Link>
        {hasSession ? (
          <button
            type="button"
            onClick={handleLogout}
            className={`${navBtn} border border-[#6b3038] bg-[#1f1215] text-[#f0c4c8] hover:bg-[#2a181c]`}
          >
            Terminar sessão
          </button>
        ) : null}
      </nav>
    </div>
  );
}
