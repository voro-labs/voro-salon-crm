# Design: Testes E2E com Playwright — Voro Salon CRM Frontend

**Data:** 2026-05-14  
**Escopo:** `voro-salon-crm-front/`  
**Abordagem:** Page Object Model (POM)

---

## Contexto

O frontend Next.js não possui nenhuma cobertura de testes automatizados. O CI atual (`test-pr.yml`) roda apenas testes C# do backend. Este design introduz testes E2E com Playwright cobrindo os principais módulos da aplicação.

---

## Estrutura de Arquivos

```
voro-salon-crm-front/
  e2e/
    fixtures/
      auth.setup.ts          # faz login via UI, salva storageState
      .auth/
        user.json            # estado de autenticação salvo (gitignored)
    pages/
      login.page.ts
      appointments.page.ts
      clients.page.ts
      employees.page.ts
      services.page.ts
      finance.page.ts
      reports.page.ts
      settings.page.ts
      booking.page.ts
    tests/
      auth.spec.ts
      appointments.spec.ts
      clients.spec.ts
      employees.spec.ts
      services.spec.ts
      finance.spec.ts
      reports.spec.ts
      settings.spec.ts
      booking.spec.ts
  playwright.config.ts
  .env.test                  # gitignored, credenciais locais
```

---

## Configuração do Playwright (`playwright.config.ts`)

Dois projetos Playwright:

- **`setup`** — executa `auth.setup.ts`, salva `e2e/fixtures/.auth/user.json`
- **`frontend`** — depende de `setup`, carrega `storageState` com autenticação

`baseURL` lido de `PLAYWRIGHT_BASE_URL` (default: `http://localhost:3000`).  
Credenciais lidas de `TEST_EMAIL` e `TEST_PASSWORD`.

---

## Autenticação

O `auth.setup.ts` navega para `/admin/sign-in`, preenche e-mail e senha via UI, aguarda o redirect pós-login e salva o `storageState`. Todos os testes de módulos protegidos reutilizam esse estado — nenhum test individual repete o fluxo de login.

Testes do módulo `booking` e de redirect sem auth rodam sem storageState.

---

## Cobertura por Módulo

| Módulo | Cenários |
|--------|---------|
| **auth** | Login válido → redirect; login inválido → mensagem de erro; acesso sem auth → redirect para sign-in; logout |
| **appointments** | Listar; criar novo (fluxo completo); visualizar detalhe; cancelar |
| **clients** | Listar; criar; editar; visualizar perfil |
| **employees** | Listar; visualizar perfil |
| **services** | Listar; criar; editar |
| **finance** | Visualizar extrato; acessar categorias |
| **reports** | Página carrega e exibe dados |
| **settings** | Navegação entre seções; horários de funcionamento |
| **booking** | Fluxo público completo: serviço → profissional → data/hora → dados → confirmação |

---

## Page Objects

Cada `Page Object`:
- Recebe `page: Page` do Playwright no construtor
- Expõe métodos de alto nível (`fillForm()`, `submit()`, `expectSuccess()`)
- Centraliza todos os seletores — nenhum seletor fica diretamente nos specs
- Seletores priorizados: `data-testid` > ARIA roles > texto visível (sem CSS frágil)

---

## Variáveis de Ambiente

| Variável | Uso |
|----------|-----|
| `PLAYWRIGHT_BASE_URL` | URL base dos testes (local ou preview) |
| `TEST_EMAIL` | E-mail do usuário de teste |
| `TEST_PASSWORD` | Senha do usuário de teste |

Local: arquivo `.env.test` (gitignored).  
CI: GitHub Secrets.

---

## CI — Novo Workflow (`test-frontend-pr.yml`)

- Disparado em PRs para `main` e `dev`
- Job separado do backend — não bloqueia o CI de testes C#
- Passos:
  1. Checkout
  2. Setup Node.js
  3. `npm ci` no `voro-salon-crm-front/`
  4. `npx playwright install --with-deps`
  5. Build Next.js (`npm run build`)
  6. Start servidor + aguardar estar pronto
  7. `npx playwright test`
  8. Upload do relatório HTML como artefato do PR
- Secrets usados: `TEST_EMAIL`, `TEST_PASSWORD`, `PLAYWRIGHT_BASE_URL` (opcional, para preview)

---

## Scripts no `package.json`

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

---

## O que NÃO está no escopo

- Testes de componentes isolados (isso seria Storybook/Vitest)
- Testes de API (cobertos pelos testes C# existentes)
- Testes de performance ou acessibilidade automatizada
- Adição de `data-testid` em massa (seletores por role/texto onde não existir)
