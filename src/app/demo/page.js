/**
 * Cliente React da rota `/demo`: consome auth, `users` e `demo_items` via `fetch`.
 *
 * Layout lógico:
 * - Sem token: formulário de login → `POST /api/auth/login`.
 * - Com token: cartão JWT, documentação Postman (URLs e exemplos), bloco «Experimentar na prática»
 *   (registo, perfil, apagar conta; em `demo_items`: INSERT, lista GET com edição, tabela GET, PATCH/DELETE por id).
 *
 * Contratos relevantes:
 * - Persistência de sessão: `localStorage.auth_token`.
 * - APIs protegidas: `Authorization: Bearer <JWT>`.
 * - O `user_id` efetivo vem do token no servidor; não usar corpos JSON para escolher outro utilizador.
 * - `PATCH/DELETE /api/users/:id`: o segmento `:id` tem de coincidir com o `sub` do JWT.
 *
 * `decodeJwtSub` apenas lê o payload para a UI; a assinatura só é validada nas rotas API.
 */
"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Extrai o claim `sub` do payload de um JWT sem verificar assinatura (formato `header.payload.signature`, Base64URL).
 * Serve para apresentar o id do utilizador na UI; dados manipulados no cliente não são fonte de verdade.
 */
function decodeJwtSub(jwt) {
  if (!jwt || typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    // Base64URL → Base64 com padding para `atob`.
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "====".slice(pad);
    const payload = JSON.parse(atob(b64));
    const id = Number.parseInt(String(payload.sub ?? ""), 10);
    return Number.isFinite(id) && id >= 1 ? id : null;
  } catch {
    return null;
  }
}

/** Cabeçalhos para `fetch` JSON com JWT: `Content-Type` + `Authorization: Bearer`. */
function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default function DemoPage() {
  const router = useRouter();

  // Estado: formulários controlados e dados do servidor.

  /** `null` sem token em memória; string = JWT (sincronizado com `localStorage` após login). */
  const [token, setToken] = useState(null);
  /** Credenciais do formulário de login (visível quando `!token`). */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  /** Resultado do GET /api/demo/items: array de linhas devolvidas pelo servidor. */
  const [items, setItems] = useState([]);
  const [listError, setListError] = useState("");
  const [listSuccess, setListSuccess] = useState("");
  const [listLoading, setListLoading] = useState(false);

  /** Formulário INSERT (POST): novo item na tabela `demo_items`. */
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [insertError, setInsertError] = useState("");
  const [insertSuccess, setInsertSuccess] = useState("");
  /** PATCH/DELETE na lista: `actionRowId` associa mensagens de feedback à linha afetada. */
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionRowId, setActionRowId] = useState(null);

  const [tokenMsg, setTokenMsg] = useState("");
  const [originMsg, setOriginMsg] = useState("");

  /** Modo edição inline: `editingId` identifica qual linha está a ser alterada (PATCH). */
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  /** Indicadores visuais após copiar token ou origem para a área de transferência. */
  const [tokenCopied, setTokenCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [originCopied, setOriginCopied] = useState(false);

  /** Estado dos formulários «Experimentar»: prefixos `reg*`, `prof*`, `delAcc*`, `lab*` por fluxo. */
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regOk, setRegOk] = useState("");

  const [profCurrent, setProfCurrent] = useState("");
  /** Segmento `:id` em `PATCH /api/users/:id`; pré-preenchido com `sub` do JWT, editável para testar 403. */
  const [profTargetUserId, setProfTargetUserId] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profPassword, setProfPassword] = useState("");
  const [profLoading, setProfLoading] = useState(false);
  const [profError, setProfError] = useState("");
  const [profOk, setProfOk] = useState("");

  const [delAccTargetUserId, setDelAccTargetUserId] = useState("");
  const [delAccPassword, setDelAccPassword] = useState("");
  const [delAccLoading, setDelAccLoading] = useState(false);
  const [delAccError, setDelAccError] = useState("");

  const [labPatchId, setLabPatchId] = useState("");
  const [labPatchTitle, setLabPatchTitle] = useState("");
  const [labPatchContent, setLabPatchContent] = useState("");
  const [labPatchLoading, setLabPatchLoading] = useState(false);
  const [labPatchError, setLabPatchError] = useState("");

  const [labDelId, setLabDelId] = useState("");
  const [labDelLoading, setLabDelLoading] = useState(false);
  const [labDelError, setLabDelError] = useState("");
  const [labDelSuccess, setLabDelSuccess] = useState("");

  const [labPatchSuccess, setLabPatchSuccess] = useState("");

  /** Espelha `authAllowRegister` de `GET /api/config/public`; oculta o cartão de registo quando falso. */
  const [authAllowRegister, setAuthAllowRegister] = useState(false);

  /** Derivado do token: id numérico para montar URLs `/api/users/{id}` sem novo pedido ao servidor. */
  const userIdFromToken = useMemo(() => decodeJwtSub(token), [token]);

  /** Sincroniza ids alvo de perfil/apagar conta com o `sub` do token quando este muda. */
  useEffect(() => {
    if (userIdFromToken != null) {
      const s = String(userIdFromToken);
      setProfTargetUserId(s);
      setDelAccTargetUserId(s);
    } else {
      setProfTargetUserId("");
      setDelAccTargetUserId("");
    }
  }, [userIdFromToken]);

  /** Montagem: `localStorage.auth_token`, `window.location.origin`, e config pública do servidor. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
    const t = localStorage.getItem("auth_token");
    setToken(t);
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.authAllowRegister === "boolean") {
          setAuthAllowRegister(data.authAllowRegister);
        }
      })
      .catch(() => {});
  }, []);

  /**
   * `GET /api/demo/items`: lista filtrada por utilizador no servidor.
   * Retorno: contagem de linhas ou `null` (sem token / erro). Referência estável (`useCallback`) para o `useEffect` do token.
   */
  const loadItems = useCallback(async (t) => {
    if (!t) return null;
    setListError("");
    setListSuccess("");
    setListLoading(true);
    try {
      const res = await fetch("/api/demo/items", { headers: authHeaders(t) });
      // Resposta não JSON: `data` fica `{}` e cai no ramo de erro.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError(data.error ?? "Erro ao carregar lista.");
        return null;
      }
      const arr = Array.isArray(data.items) ? data.items : [];
      setItems(arr);
      setListSuccess(`Sucesso: GET 200, ${arr.length} registo(s) em demo_items.`);
      return arr.length;
    } catch {
      setListError("Falha: erro de rede ao obter a lista.");
      return null;
    } finally {
      setListLoading(false);
    }
  }, []);

  /** Ao obter token, carrega a lista de itens. */
  useEffect(() => {
    if (token) loadItems(token);
  }, [token, loadItems]);

  /** `POST /api/auth/login`: grava JWT em `localStorage` e dispara `apis-auth-changed` para a navegação. */
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.error ?? "Falha no login.");
        return;
      }
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        setToken(data.token);
        window.dispatchEvent(new Event("apis-auth-changed"));
        setLoginSuccess("Sucesso: login (200). Sessão iniciada.");
      }
    } catch {
      setLoginError("Falha: erro de rede.");
    } finally {
      setLoginLoading(false);
    }
  }

  /** Logout via navegação: estado local e redirecionamento (token removido no `AppTopNav`). */
  function afterLogoutFromNav() {
    setToken(null);
    setItems([]);
    setTokenCopied(false);
    router.push("/login");
    router.refresh();
  }

  /** Copia o JWT para a área de transferência (ex.: cliente HTTP externo). */
  async function copyTokenToClipboard() {
    setTokenMsg("");
    if (!token || typeof navigator === "undefined" || !navigator.clipboard) {
      setTokenMsg("Falha: não foi possível copiar (clipboard indisponível).");
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setTokenMsg("Sucesso: token copiado para a área de transferência.");
      window.setTimeout(() => setTokenCopied(false), 2500);
    } catch {
      setTokenCopied(false);
      setTokenMsg("Falha: permissão negada ou erro ao copiar.");
    }
  }

  /** Copia `window.location.origin` (variável de ambiente tipo `base_url` em clientes HTTP). */
  async function copyOriginToClipboard() {
    setOriginMsg("");
    if (!origin || typeof navigator === "undefined" || !navigator.clipboard) {
      setOriginMsg("Falha: não foi possível copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(origin);
      setOriginCopied(true);
      setOriginMsg("Sucesso: base_url copiada.");
      window.setTimeout(() => setOriginCopied(false), 2500);
    } catch {
      setOriginCopied(false);
      setOriginMsg("Falha: erro ao copiar.");
    }
  }

  /** POST /api/demo/items: cria uma linha associada ao `user_id` derivado do token no servidor. */
  async function handleInsert(e) {
    e.preventDefault();
    if (!token) return;
    setInsertError("");
    setInsertSuccess("");
    try {
      const res = await fetch("/api/demo/items", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          title: newTitle,
          content: newContent || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInsertError(data.error ?? "Falha: erro ao inserir (POST).");
        return;
      }
      setNewTitle("");
      setNewContent("");
      setInsertSuccess("Sucesso: item criado (201). A lista foi atualizada.");
      await loadItems(token);
    } catch {
      setInsertError("Falha: erro de rede.");
    }
  }

  /** Ativa edição inline na linha; PATCH ao confirmar «Guardar». */
  function startEdit(row) {
    setEditingId(row.id);
    setEditTitle(row.title ?? "");
    setEditContent(row.content ?? "");
    setActionError("");
    setActionSuccess("");
    setActionRowId(row.id);
  }

  /** PATCH /api/demo/items/:id: atualização parcial dos campos visíveis no formulário inline. */
  async function saveEdit(id) {
    if (!token) return;
    setActionError("");
    setActionSuccess("");
    setActionRowId(id);
    try {
      const res = await fetch(`/api/demo/items/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error ?? "Falha: PATCH não aplicado.");
        return;
      }
      setEditingId(null);
      setActionSuccess("Sucesso: item atualizado (200).");
      await loadItems(token);
    } catch {
      setActionError("Falha: erro de rede.");
    }
  }

  /** DELETE /api/demo/items/:id: remove o registo se pertencer ao utilizador autenticado. */
  async function handleDelete(id) {
    if (!token) return;
    if (!window.confirm("Apagar este item?")) return;
    setActionError("");
    setActionSuccess("");
    setActionRowId(id);
    try {
      const res = await fetch(`/api/demo/items/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error ?? "Falha: DELETE não executado.");
        return;
      }
      setActionSuccess("Sucesso: item apagado (200).");
      await loadItems(token);
    } catch {
      setActionError("Falha: erro de rede.");
    }
  }

  /** `POST /api/auth/register` sem Bearer; não substitui o token atual da sessão. */
  async function handleRegisterLab(e) {
    e.preventDefault();
    if (!authAllowRegister) {
      setRegError("Registo público desativado no servidor (AUTH_ALLOW_REGISTER).");
      return;
    }
    setRegError("");
    setRegOk("");
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegError(data.error ?? "Registo falhou.");
        return;
      }
      setRegOk("Utilizador criado. Faz login com este email e password.");
      setRegEmail("");
      setRegPassword("");
    } catch {
      setRegError("Erro de rede.");
    } finally {
      setRegLoading(false);
    }
  }

  /** `PATCH /api/users/:id` com Bearer da sessão; `id` ≠ `sub` do token → 403. */
  async function handleProfileLab(e) {
    e.preventDefault();
    if (!token) return;
    setProfError("");
    setProfOk("");
    const targetId = Number.parseInt(profTargetUserId.trim(), 10);
    if (!Number.isFinite(targetId) || targetId < 1) {
      setProfError("Indica um id válido (número inteiro ≥ 1).");
      return;
    }
    const hasEmail = profEmail.trim().length > 0;
    const hasPwd = profPassword.length > 0;
    if (!profCurrent) {
      setProfError("Indica a password atual.");
      return;
    }
    if (!hasEmail && !hasPwd) {
      setProfError("Preenche novo email e/ou nova password.");
      return;
    }
    if (hasPwd && profPassword.length < 8) {
      setProfError("A nova password deve ter pelo menos 8 caracteres.");
      return;
    }
    setProfLoading(true);
    try {
      const body = { current_password: profCurrent };
      if (hasEmail) body.email = profEmail.trim().toLowerCase();
      if (hasPwd) body.password = profPassword;
      const res = await fetch(`/api/users/${targetId}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfError(data.error ?? "Erro ao atualizar perfil.");
        return;
      }
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        setToken(data.token);
        window.dispatchEvent(new Event("apis-auth-changed"));
      }
      setProfOk("Perfil atualizado. O token foi renovado no browser.");
      setProfCurrent("");
      setProfEmail("");
      setProfPassword("");
    } catch {
      setProfError("Erro de rede.");
    } finally {
      setProfLoading(false);
    }
  }

  /** `DELETE /api/users/:id`; após sucesso remove token e envia para `/login`. */
  async function handleDeleteAccountLab(e) {
    e.preventDefault();
    if (!token) return;
    setDelAccError("");
    const targetId = Number.parseInt(delAccTargetUserId.trim(), 10);
    if (!Number.isFinite(targetId) || targetId < 1) {
      setDelAccError("Indica um id válido (número inteiro ≥ 1).");
      return;
    }
    if (!delAccPassword) {
      setDelAccError("Indica a password atual.");
      return;
    }
    if (
      !window.confirm(
        `Isto envia DELETE /api/users/${targetId} (conta e demo_items em cascata). Continuar?`
      )
    ) {
      return;
    }
    setDelAccLoading(true);
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ current_password: delAccPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDelAccError(data.error ?? "Erro ao apagar conta.");
        return;
      }
      /* Resposta 200: conta removida; sessão atual invalidada. */
      setDelAccPassword("");
      localStorage.removeItem("auth_token");
      setToken(null);
      setItems([]);
      window.dispatchEvent(new Event("apis-auth-changed"));
      router.push("/login");
      router.refresh();
    } catch {
      setDelAccError("Erro de rede.");
    } finally {
      setDelAccLoading(false);
    }
  }

  /** `PATCH /api/demo/items/:id` com corpo parcial (campos opcionais), alternativa à edição inline na lista. */
  async function handlePatchItemLab(e) {
    e.preventDefault();
    if (!token) return;
    setLabPatchError("");
    setLabPatchSuccess("");
    const id = Number.parseInt(labPatchId, 10);
    if (!Number.isFinite(id) || id < 1) {
      setLabPatchError("Id inválido.");
      return;
    }
    const t = labPatchTitle.trim();
    const payload = {};
    if (t) payload.title = t;
    if (labPatchContent !== "") payload.content = labPatchContent;
    if (Object.keys(payload).length === 0) {
      setLabPatchError("Preenche novo título e/ou conteúdo.");
      return;
    }
    setLabPatchLoading(true);
    try {
      const res = await fetch(`/api/demo/items/${id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLabPatchError(data.error ?? "Falha: PATCH não aplicado.");
        return;
      }
      setLabPatchSuccess("Sucesso: item atualizado (200). A lista foi recarregada.");
      await loadItems(token);
    } catch {
      setLabPatchError("Falha: erro de rede.");
    } finally {
      setLabPatchLoading(false);
    }
  }

  /** `DELETE /api/demo/items/:id` por id explícito (mesmo endpoint que o botão na lista). */
  async function handleDeleteItemLab(e) {
    e.preventDefault();
    if (!token) return;
    setLabDelError("");
    setLabDelSuccess("");
    const id = Number.parseInt(labDelId, 10);
    if (!Number.isFinite(id) || id < 1) {
      setLabDelError("Id inválido.");
      return;
    }
    if (!window.confirm(`Apagar o item id=${id}?`)) return;
    setLabDelLoading(true);
    try {
      const res = await fetch(`/api/demo/items/${id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLabDelError(data.error ?? "Falha: DELETE não executado.");
        return;
      }
      setLabDelId("");
      setLabDelSuccess("Sucesso: item apagado (200). A lista foi recarregada.");
      await loadItems(token);
    } catch {
      setLabDelError("Falha: erro de rede.");
    } finally {
      setLabDelLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* `AppTopNav`: logout chama `afterLogoutFromNav`. */}
      <AppTopNav
        className="sticky top-0 z-30"
        onLogout={afterLogoutFromNav}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
        {/* Cabeçalho da página: resumo dos recursos REST abrangidos. */}
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Demonstração CRUD
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Login → <strong className="text-zinc-800 dark:text-zinc-200">SELECT</strong> (GET),{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">INSERT</strong> (POST),{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">UPDATE</strong> (PATCH),{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">DELETE</strong> na tabela{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">demo_items</code>
            ; perfil e apagar conta em{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/api/users/{"{id}"}</code>{" "}
            (mesmo <code className="text-xs">id</code> que no token).
          </p>
        </header>

        {!token ? (
        /* Sem token: apenas o formulário de login (equivalente a `/login`). */
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Iniciar sessão
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa o mesmo login da app; o token fica em{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">localStorage</code>.
          </p>
          <form onSubmit={handleLogin} className="mt-6 flex max-w-md flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loginLoading ? "A entrar…" : "Entrar"}
            </button>
            {loginError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
            ) : null}
            {loginSuccess ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{loginSuccess}</p>
            ) : null}
          </form>
        </section>
      ) : (
        <>
          {/* Com token: JWT, documentação Postman, depois «Experimentar na prática». */}
          {/* Cartão do token JWT (valor sensível; evitar exposição em capturas ou logs). */}
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/35">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100">
                  Bearer token (JWT)
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-amber-900/85 dark:text-amber-200/90">
                  Copia este valor para o Postman:{" "}
                  <strong>Authorization</strong> → tipo{" "}
                  <strong>Bearer Token</strong> e cola aqui; ou cabeçalho manual{" "}
                  <code className="rounded bg-amber-100/90 px-1.5 py-0.5 text-xs dark:bg-amber-900/80">
                    Authorization: Bearer &lt;token&gt;
                  </code>
                  . Não partilhes em público. Dá acesso à tua sessão.
                </p>
                {userIdFromToken != null ? (
                  <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/95">
                    O teu <strong className="font-semibold">id</strong> de utilizador (JWT{" "}
                    <code className="rounded bg-amber-100/90 px-1 text-xs dark:bg-amber-900/80">sub</code>
                    ) é <strong>{userIdFromToken}</strong>
                    . Usa-o no URL{" "}
                    <code className="rounded bg-amber-100/90 px-1 text-xs dark:bg-amber-900/80">
                      /api/users/{userIdFromToken}
                    </code>{" "}
                    nas rotas de perfil e apagar conta.
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={copyTokenToClipboard}
                  className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-50 dark:hover:bg-amber-900"
                >
                  {tokenCopied ? "Copiado!" : "Copiar token"}
                </button>
                {tokenMsg ? (
                  <p
                    className={`max-w-[16rem] text-right text-xs sm:max-w-xs ${
                      tokenMsg.startsWith("Sucesso")
                        ? "text-emerald-800 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {tokenMsg}
                  </p>
                ) : null}
              </div>
            </div>
            <pre className="mt-4 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-amber-200/80 bg-white p-4 font-mono text-xs leading-relaxed text-zinc-900 shadow-inner dark:border-amber-900/50 dark:bg-zinc-950 dark:text-zinc-100">
              {token}
            </pre>
          </section>

          {/* Documentação estática para replicação de pedidos no Postman (sem lógica de servidor). */}
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/50 dark:bg-sky-950/30">
            <h2 className="text-base font-semibold text-sky-950 dark:text-sky-100">
              Postman: usar todas as APIs
            </h2>
            <p className="mt-1 text-sm text-sky-900/90 dark:text-sky-200/90">
              Segue a ordem: ambiente → login → token → APIs de{" "}
              <strong className="font-medium text-sky-950 dark:text-sky-100">autenticação</strong>{" "}
              (registo opcional, perfil, apagar conta) → depois o CRUD de{" "}
              <code className="rounded bg-white px-1 text-xs dark:bg-zinc-800">demo_items</code>.
            </p>

            <div className="mt-4 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-800/60 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                1. Variável base no Postman
              </p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                Cria um <strong>Environment</strong> e define{" "}
                <code className="rounded bg-sky-100 px-1 dark:bg-sky-900/70">base_url</code>{" "}
                com o valor abaixo (é o teu servidor Next neste momento).
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-[12rem] rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-zinc-100">
                  {origin || "…"}
                </code>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={copyOriginToClipboard}
                    className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-950 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-50 dark:hover:bg-sky-900"
                  >
                    {originCopied ? "Copiado!" : "Copiar base_url"}
                  </button>
                  {originMsg ? (
                    <p
                      className={`text-xs ${
                        originMsg.startsWith("Sucesso")
                          ? "text-emerald-800 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {originMsg}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-800/60 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                2. Login: <code className="font-mono">POST /api/auth/login</code> (sem Bearer)
              </p>
              <ul className="list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
                <li>
                  Novo pedido: método <strong>POST</strong>, URL{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                    {"{{base_url}}/api/auth/login"}
                  </code>
                </li>
                <li>
                  Body → <strong>raw</strong> → <strong>JSON</strong>
                </li>
              </ul>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                {`{\n  "email": "teste@teste.pt",\n  "password": "teste"\n}`}
              </pre>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Na resposta <strong>200</strong>, copia o campo <code className="text-xs">token</code>{" "}
                (ou usa o token já mostrado no cartão acima).
              </p>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-800/60 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                3. Autorização (rotas protegidas)
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Para <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">/api/users/*</code>{" "}
                e <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">/api/demo/*</code>:
                separador <strong>Authorization</strong> → tipo <strong>Bearer Token</strong> → cola o
                JWT (ou variável{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                  {"{{token}}"}
                </code>{" "}
                se o gravaste no Environment após o login). O registo (passo 4a) <strong>não</strong> usa
                Bearer.
              </p>
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-800/60 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                4. APIs de autenticação e conta
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Primeiro login e Bearer; depois podes usar registo (se ativo), perfil e apagar conta.
              </p>

              <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/20">
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                  4a. Opcional: registo de utilizador (sem Bearer)
                </p>
                {authAllowRegister ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Esta rota <strong>não</strong> usa o JWT da sessão. Serve para criar conta nova. POST{" "}
                    <code className="text-xs">{"{{base_url}}/api/auth/register"}</code>, body JSON com{" "}
                    <code className="text-xs">email</code> e <code className="text-xs">password</code>{" "}
                    (mín. 8 caracteres). Depois faz login para obter o JWT para as rotas protegidas.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    No servidor atual o registo público está <strong>desativado</strong>{" "}
                    (<code className="text-xs">AUTH_ALLOW_REGISTER</code>). Para testar{" "}
                    <code className="text-xs">/api/demo/*</code> e <code className="text-xs">/api/users/*</code>{" "}
                    usa o <strong>Bearer</strong> da sessão (cartão acima ou login). Não precisas de registo
                    novo. A mensagem «Registo desativado» vem desta política, não de falta de token.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                  4b. Perfil e apagar conta: <code className="font-mono">auth_users</code> (com Bearer)
                </p>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  O número no path é o <strong>id do utilizador</strong> e tem de ser o mesmo que no JWT
                  (campo{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">sub</code>
                  ). Se pedires outro id, o servidor responde <strong>403</strong>. Substitui{" "}
                  <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-700">
                    {userIdFromToken ?? "{{user_id}}"}
                  </code>{" "}
                  {userIdFromToken != null
                    ? "pelo teu id (já indicado no cartão do token acima)."
                    : "pelo teu id (vê na resposta do login: campo user.id)."}
                </p>
                <dl className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <div>
                    <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                      PATCH: alterar email e/ou password
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                      PATCH{" "}
                      {`{{base_url}}/api/users/${userIdFromToken ?? "{{user_id}}"}`}
                    </dd>
                    <dd className="mt-2">
                      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                        {`{\n  "current_password": "a_tua_password_atual",\n  "email": "novo@email.pt",\n  "password": "nova_password_8_chars_min"\n}`}
                      </pre>
                    </dd>
                    <dd className="text-xs text-zinc-500 dark:text-zinc-500">
                      Envia pelo menos <code className="text-xs">email</code> ou{" "}
                      <code className="text-xs">password</code> além de{" "}
                      <code className="text-xs">current_password</code>. Resposta{" "}
                      <strong>200</strong> inclui um <strong>novo token</strong>. Substitui o JWT no
                      cliente.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                      DELETE: apagar a tua conta
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                      DELETE{" "}
                      {`{{base_url}}/api/users/${userIdFromToken ?? "{{user_id}}"}`}
                    </dd>
                    <dd className="mt-2">
                      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                        {`{\n  "current_password": "a_tua_password_atual"\n}`}
                      </pre>
                    </dd>
                    <dd className="text-xs text-zinc-500 dark:text-zinc-500">
                      Corpo JSON obrigatório. Os teus <code className="text-xs">demo_items</code> são
                      removidos em cascata (FK).
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-sky-200/80 bg-white p-4 dark:border-sky-800/60 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                5. API de demonstração: <code className="font-mono">demo_items</code> (CRUD, com Bearer)
              </p>
              <dl className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    SELECT: listar
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                    GET {"{{base_url}}/api/demo/items"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    INSERT: criar
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                    POST {"{{base_url}}/api/demo/items"}
                  </dd>
                  <dd className="mt-2">
                    <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                      {`{\n  "title": "Título de exemplo",\n  "content": "Texto opcional"\n}`}
                    </pre>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    UPDATE: alterar
                  </dt>
                  <dd className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Substitui <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">1</code> pelo{" "}
                    <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">id</code> que vês na
                    lista ou no SELECT.
                  </dd>
                  <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                    PATCH {"{{base_url}}/api/demo/items/1"}
                  </dd>
                  <dd className="mt-2">
                    <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
                      {`{\n  "title": "Novo título",\n  "content": "Novo texto"\n}`}
                    </pre>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    DELETE: apagar
                  </dt>
                  <dd className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Mesmo <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">id</code> que no
                    PATCH.
                  </dd>
                  <dd className="mt-1 font-mono text-xs text-sky-800 dark:text-sky-300">
                    DELETE {"{{base_url}}/api/demo/items/1"}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="mt-4 text-xs text-sky-800/80 dark:text-sky-300/80">
              Documentação completa no repositório:{" "}
              <code className="rounded bg-white px-1 dark:bg-zinc-900">docs/postman.md</code>
            </p>
          </section>

          {/* Formulários que disparam as mesmas rotas da documentação, com feedback na página. */}
          <div className="flex flex-col gap-8 border-t border-zinc-200 pt-10 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Experimentar na prática
            </h2>

            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
              Autenticação
            </h3>

            {authAllowRegister ? (
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  Registo: POST /api/auth/register
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Rota <strong>pública</strong>. Não envia o Bearer da sessão (cria outra conta). Só está
                  disponível porque o servidor tem{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">AUTH_ALLOW_REGISTER=true</code>.
                </p>
                <form onSubmit={handleRegisterLab} className="mt-4 flex max-w-md flex-col gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Email do novo utilizador"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Password (mín. 8 caracteres)"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-fit rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
                  >
                    {regLoading ? "A registar…" : "Registar"}
                  </button>
                  {regError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">{regError}</p>
                  ) : null}
                  {regOk ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{regOk}</p>
                  ) : null}
                </form>
              </section>
            ) : (
              <section className="rounded-2xl border border-zinc-200 border-dashed bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
                <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-200">
                  Registo: POST /api/auth/register (inativo neste servidor)
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  O registo público está desligado. Para a <strong>demonstração</strong> usa o JWT já na
                  sessão (Bearer) para <code className="text-xs">/api/demo/*</code> e{" "}
                  <code className="text-xs">/api/users/*</code>. A mensagem «Registo desativado» refere-se
                  a esta política, não à falta de autorização nas rotas protegidas.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Perfil: PATCH /api/users/
                {profTargetUserId.trim() || "{id}"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Escolhe o <strong className="text-zinc-700 dark:text-zinc-200">id</strong> no path (por
                defeito o do teu token: {userIdFromToken ?? "-"}). O pedido usa sempre o{" "}
                <strong>Bearer</strong> da sessão. Se o id não for o teu, a API responde{" "}
                <code className="text-xs">403</code>.
              </p>
              <form onSubmit={handleProfileLab} className="mt-4 flex max-w-md flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Id no URL (utilizador a alterar)"
                  value={profTargetUserId}
                  onChange={(e) => setProfTargetUserId(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="password"
                  required
                  placeholder="Password atual (current_password)"
                  value={profCurrent}
                  onChange={(e) => setProfCurrent(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="email"
                  placeholder="Novo email (opcional)"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="password"
                  placeholder="Nova password (opcional, mín. 8 caracteres)"
                  value={profPassword}
                  onChange={(e) => setProfPassword(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={profLoading || !token}
                  className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {profLoading ? "A atualizar…" : "Atualizar perfil"}
                </button>
                {profError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{profError}</p>
                ) : null}
                {profOk ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{profOk}</p>
                ) : null}
              </form>
            </section>

            <section className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-zinc-950">
              <h2 className="text-lg font-medium text-red-900 dark:text-red-200">
                Apagar conta: DELETE /api/users/
                {delAccTargetUserId.trim() || "{id}"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Indica o <strong className="text-zinc-700 dark:text-red-100/90">id</strong> a apagar no
                path. Só o teu id é aceite pelo servidor; Bearer = sessão atual. Remove{" "}
                <code className="text-xs">auth_users</code> e <code className="text-xs">demo_items</code>{" "}
                em cascata.
              </p>
              <form onSubmit={handleDeleteAccountLab} className="mt-4 flex max-w-md flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Id no URL (conta a apagar)"
                  value={delAccTargetUserId}
                  onChange={(e) => setDelAccTargetUserId(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="password"
                  required
                  placeholder="Password atual para confirmar"
                  value={delAccPassword}
                  onChange={(e) => setDelAccPassword(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={delAccLoading || !token}
                  className="w-fit rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
                >
                  {delAccLoading ? "A apagar…" : "Apagar a minha conta"}
                </button>
                {delAccError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{delAccError}</p>
                ) : null}
              </form>
            </section>

            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">
              demo_items
            </h3>

            {/* POST /api/demo/items, secção demo_items */}
            <section
              id="demo-items-insert"
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                INSERT: POST /api/demo/items
              </h2>
              <form onSubmit={handleInsert} className="mt-4 flex flex-col gap-3">
                <input
                  required
                  placeholder="Título"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <textarea
                  placeholder="Conteúdo (opcional)"
                  rows={2}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  className="w-fit rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  Inserir
                </button>
                {insertError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{insertError}</p>
                ) : null}
                {insertSuccess ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{insertSuccess}</p>
                ) : null}
              </form>
            </section>

            {/* GET /api/demo/items: lista em cartões; PATCH/DELETE por linha */}
            <section
              id="demo-items-lista-principal"
              className="rounded-2xl border border-zinc-200 bg-white p-6 scroll-mt-24 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                SELECT: GET /api/demo/items
              </h2>
              {listLoading ? (
                <p className="mt-4 text-sm text-zinc-500">A carregar…</p>
              ) : null}
              {listError ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{listError}</p>
              ) : null}
              {listSuccess ? (
                <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{listSuccess}</p>
              ) : null}
              <ul className="mt-4 flex flex-col gap-4">
                {items.length === 0 && !listLoading ? (
                  <li className="text-sm text-zinc-500">Nenhum item ainda.</li>
                ) : null}
                {items.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    {editingId === row.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                        />
                        <textarea
                          rows={2}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(row.id)}
                            className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800"
                          >
                            Guardar (PATCH)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setActionError("");
                              setActionSuccess("");
                              setActionRowId(null);
                            }}
                            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                          >
                            Cancelar
                          </button>
                        </div>
                        {actionRowId === row.id && actionError ? (
                          <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
                        ) : null}
                        {actionRowId === row.id && actionSuccess ? (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            {actionSuccess}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {row.title}
                          </p>
                          {row.content ? (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {row.content}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-zinc-400">
                            id={row.id} · atualizado {row.updated_at ?? "-"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
                          >
                            Apagar (DELETE)
                          </button>
                        </div>
                        {actionRowId === row.id && actionError ? (
                          <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
                        ) : null}
                        {actionRowId === row.id && actionSuccess ? (
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            {actionSuccess}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                GET /api/demo/items (vista tabular)
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Mesmo pedido <code className="text-xs">GET /api/demo/items</code> com{" "}
                <strong>Bearer</strong>. A tabela mostra o JSON em colunas. O cartão{" "}
                <strong>SELECT (GET)</strong> logo acima apresenta a mesma lista com{" "}
                <strong>Editar</strong> / <strong>Apagar</strong>. Usa «Executar GET» para recarregar após
                alterações.
              </p>
              <button
                type="button"
                disabled={listLoading || !token}
                onClick={() => loadItems(token)}
                className="mt-4 w-fit rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {listLoading ? "A carregar…" : "Executar GET (recarregar lista)"}
              </button>
              {!token ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  Sem sessão: faz login para o GET devolver itens.
                </p>
              ) : null}
              {listError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{listError}</p>
              ) : null}
              {listSuccess && token ? (
                <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{listSuccess}</p>
              ) : null}

              {/* Feedback do GET (partilha estado `listError` / `listSuccess` com a lista em cartões). */}
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Resultado: vista tabular ({items.length} registo(s))
                </p>
                <div className="mt-2 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-zinc-900 dark:text-zinc-100">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80">
                        <th className="whitespace-nowrap px-3 py-2 font-medium">id</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">user_id</th>
                        <th className="min-w-[8rem] px-3 py-2 font-medium">title</th>
                        <th className="min-w-[10rem] px-3 py-2 font-medium">content</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">created_at</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium">updated_at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                          >
                            A carregar dados…
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400"
                          >
                            Nenhuma linha. Insere um item no cartão INSERT acima nesta secção ou confirma que o
                            GET devolveu
                            lista vazia.
                          </td>
                        </tr>
                      ) : (
                        items.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-zinc-100 odd:bg-white even:bg-zinc-50/80 dark:border-zinc-800 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/40"
                          >
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.id}</td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                              {row.user_id ?? "-"}
                            </td>
                            <td className="max-w-[14rem] px-3 py-2 align-top">{row.title ?? "-"}</td>
                            <td className="max-w-[18rem] px-3 py-2 align-top text-zinc-600 dark:text-zinc-400">
                              {row.content != null && row.content !== "" ? (
                                <span className="line-clamp-3 break-words" title={row.content}>
                                  {row.content}
                                </span>
                              ) : (
                                <span className="text-zinc-400">-</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              {row.created_at ?? "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              {row.updated_at ?? "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                UPDATE: PATCH /api/demo/items/{"{id}"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Indica o <code className="text-xs">id</code> da linha (vê na lista). Alternativa aos
                botões Editar acima.
              </p>
              <form onSubmit={handlePatchItemLab} className="mt-4 flex max-w-md flex-col gap-3">
                <input
                  required
                  inputMode="numeric"
                  placeholder="Id do item"
                  value={labPatchId}
                  onChange={(e) => setLabPatchId(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  placeholder="Novo título (opcional se preencheres conteúdo)"
                  value={labPatchTitle}
                  onChange={(e) => setLabPatchTitle(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <textarea
                  placeholder="Novo conteúdo (opcional se preencheres título)"
                  rows={2}
                  value={labPatchContent}
                  onChange={(e) => setLabPatchContent(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={labPatchLoading}
                  className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {labPatchLoading ? "A enviar PATCH…" : "Aplicar PATCH"}
                </button>
                {labPatchError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{labPatchError}</p>
                ) : null}
                {labPatchSuccess ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{labPatchSuccess}</p>
                ) : null}
              </form>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                DELETE: DELETE /api/demo/items/{"{id}"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Corpo vazio. Confirmação no browser antes de apagar. Alternativa ao botão na lista.
              </p>
              <form onSubmit={handleDeleteItemLab} className="mt-4 flex max-w-md flex-col gap-3">
                <input
                  required
                  inputMode="numeric"
                  placeholder="Id do item a apagar"
                  value={labDelId}
                  onChange={(e) => setLabDelId(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={labDelLoading}
                  className="w-fit rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {labDelLoading ? "A apagar…" : "Apagar item (DELETE)"}
                </button>
                {labDelError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{labDelError}</p>
                ) : null}
                {labDelSuccess ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{labDelSuccess}</p>
                ) : null}
              </form>
            </section>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
