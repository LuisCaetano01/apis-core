/**
 * `/openapi`: Swagger UI (OpenAPI 3) sobre a spec em `@/lib/openapi/spec`.
 *
 * - `dynamic(..., { ssr: false })`: Swagger UI usa APIs do browser; evita SSR deste bundle.
 * - `servers` em `useEffect`: spec base sem host fixo; `url` = `window.location.origin`.
 * - `requestInterceptor`: repete `Authorization: Bearer` a partir de `localStorage.auth_token` nas rotas
 *   `/api/demo/*` e `/api/users/*` (login/register excluídos).
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AppTopNav } from "@/components/app-top-nav";
import { openApiSpecBase } from "@/lib/openapi/spec";

import "swagger-ui-react/swagger-ui.css";
import "./swagger-corporate-dark.css";

/** Import dinâmico sem SSR: Swagger UI assume ambiente de browser. */
const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center bg-[#060a10] text-[#9db0c9]">
      A carregar Swagger UI…
    </div>
  ),
});

/** Rotas onde o interceptor anexa Bearer (alinhado com `/demo`); login/register sem token. */
function shouldAttachSessionBearer(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  if (u.includes("/api/auth/login") || u.includes("/api/auth/register")) return false;
  return u.includes("/api/demo") || u.includes("/api/users");
}

/** Interceptor Swagger: injeta `Authorization` se existir `auth_token` e o URL for elegível. */
function buildRequestInterceptor() {
  return (req) => {
    if (typeof window === "undefined") return req;
    const url = req.url ?? "";
    if (!shouldAttachSessionBearer(url)) return req;
    const t = localStorage.getItem("auth_token");
    if (t) {
      req.headers.Authorization = `Bearer ${t}`;
    }
    return req;
  };
}

export default function OpenApiPage() {
  /** Spec com `servers` só após hidratação (`window`). */
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    const origin = window.location.origin;
    // Adia `setSpec` ao microtask seguinte para não bloquear o primeiro paint.
    queueMicrotask(() => {
      setSpec({
        ...openApiSpecBase,
        servers: [{ url: origin, description: "Servidor atual (dev ou prod)" }],
      });
    });
  }, []);

  /** Interceptor memoizado (referência estável para o Swagger). */
  const requestInterceptor = useMemo(() => buildRequestInterceptor(), []);

  return (
    <div className="openapi-corporate openapi-corporate-shell flex min-h-full flex-1 flex-col antialiased">
      <AppTopNav className="shrink-0" />

      <div className="openapi-corporate-header border-b px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold tracking-tight">
            OpenAPI (Swagger)
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#9db0c9]">
            Testa as rotas com <strong className="text-[#e8eef7]">Try it out</strong>. Para JWT: faz
            login na app ou em{" "}
            <code className="rounded px-1.5 py-0.5 text-[13px]">POST /api/auth/login</code>, depois{" "}
            <strong className="text-[#e8eef7]">Authorize</strong> com o token, ou mantém sessão neste
            site (token em{" "}
            <code className="rounded px-1.5 py-0.5 text-[13px]">localStorage</code>, injetado
            automaticamente em <code className="text-[13px]">/api/demo/*</code> e{" "}
            <code className="text-[13px]">/api/users/*</code>).
          </p>
        </div>
      </div>

      <div className="swagger-shell mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4">
        {spec ? (
          <div className="openapi-corporate rounded-xl border border-[#243044] bg-[#0c121c] p-3 shadow-[0_24px_48px_rgba(0,0,0,0.35)] sm:p-5">
            {/* docExpansion=list: grupos fechados por defeito; persistAuthorization: token no storage do Swagger */}
            <SwaggerUI
              spec={spec}
              docExpansion="list"
              defaultModelsExpandDepth={2}
              persistAuthorization
              requestInterceptor={requestInterceptor}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
