/**
 * OpenAPI 3.0 (objeto JS), consumida pelo Swagger UI em `/openapi`.
 *
 * - `paths`: operações por URL; parâmetros, corpos e respostas.
 * - `components.schemas`: modelos reutilizáveis (`$ref`).
 * - `components.securitySchemes.bearerAuth`: JWT; rotas protegidas referenciam `security`.
 * - `servers`: omitido aqui; `openapi/page.js` define o host em runtime (`window.location.origin`).
 */
export const openApiSpecBase = {
  openapi: "3.0.3",
  info: {
    title: "apis-core",
    description:
      "Autenticação JWT e recurso CRUD `demo_items`. " +
      "Rotas protegidas: cabeçalho `Authorization: Bearer` (Swagger **Authorize**) ou `auth_token` em `localStorage` nesta aplicação (pedidos a `/api/demo/*` e `/api/users/*`).",
    version: "1.0.0",
  },
  tags: [
    {
      name: "auth",
      description:
        "Login, registo e `/api/users/{id}`. O segmento `{id}` deve coincidir com o `sub` do JWT.",
    },
    { name: "demo", description: "CRUD de itens (requer JWT)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token devolvido por POST /api/auth/login",
      },
    },
    schemas: {
      LoginBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "teste@teste.pt" },
          password: { type: "string", format: "password" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              email: { type: "string" },
            },
          },
        },
      },
      RegisterBody: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, description: "Mínimo 8 caracteres" },
        },
      },
      UserProfileUpdate: {
        type: "object",
        required: ["current_password"],
        properties: {
          current_password: {
            type: "string",
            format: "password",
            description: "Password atual (obrigatória para confirmar identidade)",
          },
          email: {
            type: "string",
            format: "email",
            description: "Novo email (opcional)",
          },
          password: {
            type: "string",
            minLength: 8,
            description: "Nova password, mínimo 8 caracteres (opcional)",
          },
        },
        description:
          "Envia pelo menos um dos campos `email` ou `password` além de `current_password`.",
      },
      UserProfileResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              email: { type: "string" },
            },
          },
          token: {
            type: "string",
            description: "Novo JWT; substitui o anterior no cliente (email pode ter mudado)",
          },
        },
      },
      UserDeleteBody: {
        type: "object",
        required: ["current_password"],
        properties: {
          current_password: {
            type: "string",
            format: "password",
            description: "Confirmação com a password atual antes de apagar a conta",
          },
        },
      },
      ErrorBody: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      DemoItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          user_id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      DemoItemCreate: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          content: { type: "string", nullable: true },
        },
      },
      DemoItemUpdate: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", nullable: true },
        },
        description: "Envia pelo menos um dos campos.",
      },
      DemoItemsList: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/DemoItem" },
          },
        },
      },
      AuthUserPublic: {
        type: "object",
        description: "Utilizador sem dados sensíveis (nunca inclui password_hash)",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      UsersListResponse: {
        type: "object",
        properties: {
          users: {
            type: "array",
            items: { $ref: "#/components/schemas/AuthUserPublic" },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Login",
        description: "Devolve um JWT. Não requer Bearer.",
        operationId: "authLogin",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginBody" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": { description: "Pedido inválido" },
          "401": { description: "Credenciais inválidas" },
          "500": { description: "Configuração em falta (ex.: JWT_SECRET)" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Registo de utilizador",
        description:
          "Só ativo se `AUTH_ALLOW_REGISTER=true` no servidor. Password mínimo 8 caracteres.",
        operationId: "authRegister",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterBody" },
            },
          },
        },
        responses: {
          "201": { description: "Utilizador criado" },
          "400": { description: "Validação falhou" },
          "403": { description: "Registo desativado" },
          "409": { description: "Email já registado" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["auth"],
        summary: "Listar utilizadores (auth_users)",
        description:
          "Devolve todos os registos com `id`, `email`, `created_at`. Só ativo se `AUTH_ALLOW_LIST_USERS=true` no servidor. Requer Bearer.",
        operationId: "usersList",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lista de utilizadores",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsersListResponse" },
              },
            },
          },
          "401": { description: "Não autenticado" },
          "403": {
            description:
              "Listagem desativada (AUTH_ALLOW_LIST_USERS não está true) ou sem permissão",
          },
          "500": { description: "Erro interno" },
        },
      },
    },
    "/api/users/{id}": {
      patch: {
        tags: ["auth"],
        summary: "Editar perfil (email e/ou password)",
        description:
          "Atualiza o utilizador com o **id** no path. O id tem de coincidir com o utilizador do JWT; caso contrário 403. Exige a password atual. Devolve um **novo token** se alterares email ou password; substitui o JWT no cliente.",
        operationId: "usersPatch",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "ID do utilizador (deve ser o teu, o mesmo que no token)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserProfileUpdate" },
            },
          },
        },
        responses: {
          "200": {
            description: "Perfil atualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfileResponse" },
              },
            },
          },
          "400": { description: "Validação" },
          "401": { description: "Não autenticado ou password atual incorreta" },
          "403": { description: "O id no URL não é o do utilizador autenticado" },
          "404": { description: "Utilizador não encontrado" },
          "409": { description: "Email já em uso" },
          "500": { description: "Erro interno" },
        },
      },
      delete: {
        tags: ["auth"],
        summary: "Apagar conta (por id no URL)",
        description:
          "Remove o registo em `auth_users` com o **id** indicado no path (tem de ser o teu id, o mesmo do JWT). Os `demo_items` desse utilizador são apagados em cascata (FK). Exige password atual no corpo JSON.",
        operationId: "usersDelete",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "ID do utilizador a apagar (deve coincidir com o token)",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserDeleteBody" },
            },
          },
        },
        responses: {
          "200": { description: "Conta apagada" },
          "400": { description: "Corpo inválido ou password em falta" },
          "401": { description: "Não autenticado ou password incorreta" },
          "403": { description: "O id no URL não é o do utilizador autenticado" },
          "404": { description: "Utilizador não encontrado" },
          "500": { description: "Erro interno" },
        },
      },
    },
    "/api/demo/items": {
      get: {
        tags: ["demo"],
        summary: "Listar itens (SELECT)",
        description: "Lista `demo_items` do utilizador autenticado.",
        operationId: "demoItemsList",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DemoItemsList" },
              },
            },
          },
          "401": { description: "Não autenticado" },
          "500": { description: "Erro de servidor" },
        },
      },
      post: {
        tags: ["demo"],
        summary: "Criar item (INSERT)",
        operationId: "demoItemsCreate",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DemoItemCreate" },
            },
          },
        },
        responses: {
          "201": { description: "Criado" },
          "400": { description: "Validação" },
          "401": { description: "Não autenticado" },
          "503": { description: "Tabela em falta; corre migração demo_items" },
        },
      },
    },
    "/api/demo/items/{id}": {
      patch: {
        tags: ["demo"],
        summary: "Atualizar item (UPDATE)",
        operationId: "demoItemsPatch",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "ID do registo",
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DemoItemUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "Atualizado" },
          "400": { description: "Pedido inválido" },
          "401": { description: "Não autenticado" },
          "404": { description: "Não encontrado ou sem permissão" },
        },
      },
      delete: {
        tags: ["demo"],
        summary: "Apagar item (DELETE)",
        operationId: "demoItemsDelete",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": { description: "Apagado" },
          "401": { description: "Não autenticado" },
          "404": { description: "Não encontrado ou sem permissão" },
        },
      },
    },
  },
};
