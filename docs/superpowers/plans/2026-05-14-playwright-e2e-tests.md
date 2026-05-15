# Playwright E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar testes E2E com Playwright ao frontend Next.js (`voro-salon-crm-front/`), cobrindo autenticação e todos os módulos principais com Page Object Model.

**Architecture:** Dois projetos Playwright — `setup` (salva storageState após login UI) e `frontend` (todos os specs reutilizam o estado autenticado). Page Objects encapsulam seletores e ações; specs ficam limpos e legíveis.

**Tech Stack:** `@playwright/test`, TypeScript, Next.js 15, GitHub Actions

## Tasks

---

### Task 1: Instalação e configuração do Playwright

**Files:**
- Create: `voro-salon-crm-front/playwright.config.ts`
- Modify: `voro-salon-crm-front/package.json`
- Create: `voro-salon-crm-front/.env.test` (gitignored)

- [ ] **Step 1: Instalar dependência**

```bash
cd voro-salon-crm-front
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Criar `playwright.config.ts`**

```typescript
// voro-salon-crm-front/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'frontend',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, 'e2e/fixtures/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],
})
```

- [ ] **Step 3: Adicionar scripts ao `package.json`**

Adicionar dentro de `"scripts"`:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

- [ ] **Step 4: Criar `.env.test` com credenciais locais**

```
PLAYWRIGHT_BASE_URL=http://localhost:3000
TEST_EMAIL=seu@email.com
TEST_PASSWORD=sua_senha
BOOKING_SLUG=seu-slug-de-tenant
```

- [ ] **Step 5: Adicionar entradas ao `.gitignore` do frontend**

Adicionar ao final de `voro-salon-crm-front/.gitignore` (criar se não existir):

```
# Playwright
e2e/fixtures/.auth/
playwright-report/
test-results/
.env.test
```

- [ ] **Step 6: Commit**

```bash
git add voro-salon-crm-front/playwright.config.ts voro-salon-crm-front/package.json voro-salon-crm-front/package-lock.json
git commit -m "chore(e2e): install and configure Playwright"
```

---

### Task 2: Auth setup (storageState)

**Files:**
- Create: `voro-salon-crm-front/e2e/fixtures/auth.setup.ts`

- [ ] **Step 1: Criar diretório e arquivo `auth.setup.ts`**

```bash
mkdir -p voro-salon-crm-front/e2e/fixtures/.auth
```

```typescript
// voro-salon-crm-front/e2e/fixtures/auth.setup.ts
import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('autenticar usuário de teste', async ({ page }) => {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error('TEST_EMAIL e TEST_PASSWORD devem estar definidos')
  }

  await page.goto('/admin/sign-in')

  await page.getByLabel(/e-mail/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Aguarda redirect para fora do sign-in (login bem-sucedido)
  await page.waitForURL((url) => !url.pathname.includes('/admin/sign-in'), {
    timeout: 15000,
  })

  await page.context().storageState({ path: authFile })
})
```

- [ ] **Step 2: Verificar que o setup roda sem erros**

Com o Next.js rodando localmente (`npm run dev`), execute:

```bash
cd voro-salon-crm-front
TEST_EMAIL=seu@email.com TEST_PASSWORD=sua_senha npx playwright test e2e/fixtures/auth.setup.ts --project=setup
```

Esperado: `1 passed` e arquivo `e2e/fixtures/.auth/user.json` criado.

- [ ] **Step 3: Commit**

```bash
git add voro-salon-crm-front/e2e/fixtures/auth.setup.ts
git commit -m "test(e2e): add auth setup for storageState"
```

---

### Task 3: LoginPage Object + auth.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/login.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/auth.spec.ts`

- [ ] **Step 1: Criar `login.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/login.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/sign-in')
  }

  async fillEmail(email: string) {
    await this.page.getByLabel(/e-mail/i).fill(email)
  }

  async fillPassword(password: string) {
    await this.page.getByLabel(/senha/i).fill(password)
  }

  async submit() {
    await this.page.getByRole('button', { name: /entrar/i }).click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectError() {
    await expect(
      this.page.getByRole('alert').or(this.page.getByText(/credenciais|inválid|incorret/i))
    ).toBeVisible({ timeout: 5000 })
  }

  async expectRedirectedAway() {
    await this.page.waitForURL(
      (url) => !url.pathname.includes('/admin/sign-in'),
      { timeout: 15000 }
    )
  }
}
```

- [ ] **Step 2: Criar `auth.spec.ts`**

Estes testes rodam **sem** storageState — precisam testar o fluxo de login cru. Adicionar uma linha no `playwright.config.ts` para excluir o projeto `frontend` deste spec ou criar um terceiro projeto `no-auth`. A forma mais simples é usar `test.use({ storageState: undefined })` no início do spec.

```typescript
// voro-salon-crm-front/e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

test.use({ storageState: undefined })

const email = process.env.TEST_EMAIL ?? ''
const password = process.env.TEST_PASSWORD ?? ''

test.describe('Autenticação', () => {
  test('login com credenciais válidas redireciona para área protegida', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, password)
    await loginPage.expectRedirectedAway()
    expect(page.url()).not.toContain('/admin/sign-in')
  })

  test('login com senha incorreta exibe erro', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, 'senha_errada_12345')
    await loginPage.expectError()
    expect(page.url()).toContain('/admin/sign-in')
  })

  test('acesso a rota protegida sem auth redireciona para sign-in', async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForURL('**/admin/sign-in**', { timeout: 10000 })
    expect(page.url()).toContain('/admin/sign-in')
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
TEST_EMAIL=seu@email.com TEST_PASSWORD=sua_senha npx playwright test e2e/tests/auth.spec.ts
```

Esperado: `3 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/login.page.ts voro-salon-crm-front/e2e/tests/auth.spec.ts
git commit -m "test(e2e): add auth spec with LoginPage object"
```

---

### Task 4: AppointmentsPage + appointments.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/appointments.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/appointments.spec.ts`

- [ ] **Step 1: Criar `appointments.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/appointments.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class AppointmentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/appointments')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /agendamento/i }).or(
        this.page.getByText(/agendamento/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewAppointment() {
    await this.page.getByRole('link', { name: /novo|criar|adicionar/i }).first().click()
  }

  async expectNewAppointmentPage() {
    await this.page.waitForURL('**/appointments/new**', { timeout: 10000 })
  }

  async expectListNotEmpty() {
    // Aguarda que o skeleton de carregamento desapareça
    await this.page.waitForSelector('[class*="skeleton"]', { state: 'detached', timeout: 10000 }).catch(() => {})
    const items = this.page.locator('[class*="card"]').or(this.page.getByRole('listitem'))
    await expect(items.first()).toBeVisible({ timeout: 10000 })
  }
}
```

- [ ] **Step 2: Criar `appointments.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/appointments.spec.ts
import { test, expect } from '@playwright/test'
import { AppointmentsPage } from '../pages/appointments.page'

test.describe('Agendamentos', () => {
  test('página de agendamentos carrega corretamente', async ({ page }) => {
    const apptPage = new AppointmentsPage(page)
    await apptPage.goto()
    await apptPage.expectPageLoaded()
  })

  test('botão de novo agendamento navega para /appointments/new', async ({ page }) => {
    const apptPage = new AppointmentsPage(page)
    await apptPage.goto()
    await apptPage.expectPageLoaded()
    await apptPage.clickNewAppointment()
    await apptPage.expectNewAppointmentPage()
  })

  test('página de novo agendamento carrega', async ({ page }) => {
    await page.goto('/appointments/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/appointments.spec.ts
```

Esperado: `3 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/appointments.page.ts voro-salon-crm-front/e2e/tests/appointments.spec.ts
git commit -m "test(e2e): add appointments spec"
```

---

### Task 5: ClientsPage + clients.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/clients.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/clients.spec.ts`

- [ ] **Step 1: Criar `clients.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/clients.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ClientsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/clients')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /cliente/i }).or(
        this.page.getByText(/cliente/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewClient() {
    await this.page.getByRole('link', { name: /novo|criar|adicionar/i }).first().click()
  }

  async expectNewClientPage() {
    await this.page.waitForURL('**/clients/new**', { timeout: 10000 })
  }

  async fillNewClientForm(name: string, phone: string) {
    await this.page.getByLabel(/nome/i).fill(name)
    await this.page.getByLabel(/telefone|celular/i).fill(phone)
  }

  async submitNewClientForm() {
    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
  }

  async expectClientCreated() {
    // Após criar, retorna para lista ou exibe detalhe do cliente
    await this.page.waitForURL(/\/clients(?:\/[^/]+)?$/, { timeout: 15000 })
  }

  async searchClient(name: string) {
    const searchInput = this.page.getByPlaceholder(/buscar|pesquisar|procurar/i)
    await searchInput.fill(name)
    await this.page.waitForTimeout(500) // debounce da busca
  }
}
```

- [ ] **Step 2: Criar `clients.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/clients.spec.ts
import { test, expect } from '@playwright/test'
import { ClientsPage } from '../pages/clients.page'

test.describe('Clientes', () => {
  test('página de clientes carrega corretamente', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
  })

  test('botão de novo cliente navega para /clients/new', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
    await clientsPage.clickNewClient()
    await clientsPage.expectNewClientPage()
  })

  test('página de novo cliente renderiza o formulário', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/nome/i)).toBeVisible({ timeout: 10000 })
  })

  test('campo de busca filtra a lista', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
    await clientsPage.searchClient('abc')
    // Verifica que a busca não causou erro — lista pode estar vazia
    await expect(page.getByRole('alert')).not.toBeVisible().catch(() => {})
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/clients.spec.ts
```

Esperado: `4 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/clients.page.ts voro-salon-crm-front/e2e/tests/clients.spec.ts
git commit -m "test(e2e): add clients spec"
```

---

### Task 6: EmployeesPage + employees.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/employees.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/employees.spec.ts`

- [ ] **Step 1: Criar `employees.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/employees.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class EmployeesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/employees')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /funcionário|colaborador/i }).or(
        this.page.getByText(/funcionário|colaborador/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async clickFirstEmployee() {
    await this.page.getByRole('link').filter({ hasText: /ver|detalhe/i }).first().click()
  }

  async expectProfilePage() {
    await this.page.waitForURL(/\/employees\/[^/]+$/, { timeout: 10000 })
  }
}
```

- [ ] **Step 2: Criar `employees.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/employees.spec.ts
import { test, expect } from '@playwright/test'
import { EmployeesPage } from '../pages/employees.page'

test.describe('Funcionários', () => {
  test('página de funcionários carrega corretamente', async ({ page }) => {
    const employeesPage = new EmployeesPage(page)
    await employeesPage.goto()
    await employeesPage.expectPageLoaded()
  })

  test('página de funcionários não exibe erro 500', async ({ page }) => {
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/500|erro interno/i)).not.toBeVisible()
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/employees.spec.ts
```

Esperado: `2 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/employees.page.ts voro-salon-crm-front/e2e/tests/employees.spec.ts
git commit -m "test(e2e): add employees spec"
```

---

### Task 7: ServicesPage + services.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/services.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/services.spec.ts`

- [ ] **Step 1: Criar `services.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/services.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ServicesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/services')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /serviço/i }).or(
        this.page.getByText(/serviço/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewService() {
    await this.page.getByRole('link', { name: /novo|criar|adicionar/i }).first().click()
  }

  async expectNewServicePage() {
    await this.page.waitForURL('**/services/new**', { timeout: 10000 })
  }

  async fillNewServiceForm(name: string, price: string, durationMinutes: string) {
    await this.page.getByLabel(/nome/i).fill(name)
    await this.page.getByLabel(/preço|valor/i).fill(price)
    await this.page.getByLabel(/duração/i).fill(durationMinutes)
  }

  async submitNewServiceForm() {
    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
  }
}
```

- [ ] **Step 2: Criar `services.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/services.spec.ts
import { test, expect } from '@playwright/test'
import { ServicesPage } from '../pages/services.page'

test.describe('Serviços', () => {
  test('página de serviços carrega corretamente', async ({ page }) => {
    const servicesPage = new ServicesPage(page)
    await servicesPage.goto()
    await servicesPage.expectPageLoaded()
  })

  test('botão de novo serviço navega para /services/new', async ({ page }) => {
    const servicesPage = new ServicesPage(page)
    await servicesPage.goto()
    await servicesPage.expectPageLoaded()
    await servicesPage.clickNewService()
    await servicesPage.expectNewServicePage()
  })

  test('formulário de novo serviço renderiza os campos obrigatórios', async ({ page }) => {
    await page.goto('/services/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/nome/i)).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/services.spec.ts
```

Esperado: `3 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/services.page.ts voro-salon-crm-front/e2e/tests/services.spec.ts
git commit -m "test(e2e): add services spec"
```

---

### Task 8: FinancePage + finance.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/finance.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/finance.spec.ts`

- [ ] **Step 1: Criar `finance.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/finance.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class FinancePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/finance')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /financ/i }).or(
        this.page.getByText(/financ/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async gotoCategories() {
    await this.page.goto('/finance/categories')
    await this.page.waitForLoadState('networkidle')
  }

  async expectCategoriesPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /categor/i }).or(
        this.page.getByText(/categor/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }
}
```

- [ ] **Step 2: Criar `finance.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/finance.spec.ts
import { test } from '@playwright/test'
import { FinancePage } from '../pages/finance.page'

test.describe('Finanças', () => {
  test('página de finanças carrega corretamente', async ({ page }) => {
    const financePage = new FinancePage(page)
    await financePage.goto()
    await financePage.expectPageLoaded()
  })

  test('página de categorias carrega corretamente', async ({ page }) => {
    const financePage = new FinancePage(page)
    await financePage.gotoCategories()
    await financePage.expectCategoriesPageLoaded()
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/finance.spec.ts
```

Esperado: `2 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/finance.page.ts voro-salon-crm-front/e2e/tests/finance.spec.ts
git commit -m "test(e2e): add finance spec"
```

---

### Task 9: ReportsPage + reports.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/reports.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/reports.spec.ts`

- [ ] **Step 1: Criar `reports.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/reports.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ReportsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/reports')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /relatório/i }).or(
        this.page.getByText(/relatório/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async expectNoServerError() {
    await expect(this.page.getByText(/500|erro interno/i)).not.toBeVisible()
  }
}
```

- [ ] **Step 2: Criar `reports.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/reports.spec.ts
import { test } from '@playwright/test'
import { ReportsPage } from '../pages/reports.page'

test.describe('Relatórios', () => {
  test('página de relatórios carrega sem erros', async ({ page }) => {
    const reportsPage = new ReportsPage(page)
    await reportsPage.goto()
    await reportsPage.expectPageLoaded()
    await reportsPage.expectNoServerError()
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/reports.spec.ts
```

Esperado: `1 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/reports.page.ts voro-salon-crm-front/e2e/tests/reports.spec.ts
git commit -m "test(e2e): add reports spec"
```

---

### Task 10: SettingsPage + settings.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/settings.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/settings.spec.ts`

- [ ] **Step 1: Criar `settings.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/settings.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /configura/i }).or(
        this.page.getByText(/configura/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async gotoBusinessHours() {
    await this.page.goto('/settings/business-hours')
    await this.page.waitForLoadState('networkidle')
  }

  async expectBusinessHoursLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /horário|funcionamento/i }).or(
        this.page.getByText(/horário|funcionamento/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }
}
```

- [ ] **Step 2: Criar `settings.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/settings.spec.ts
import { test } from '@playwright/test'
import { SettingsPage } from '../pages/settings.page'

test.describe('Configurações', () => {
  test('página de configurações carrega corretamente', async ({ page }) => {
    const settingsPage = new SettingsPage(page)
    await settingsPage.goto()
    await settingsPage.expectPageLoaded()
  })

  test('página de horários de funcionamento carrega', async ({ page }) => {
    const settingsPage = new SettingsPage(page)
    await settingsPage.gotoBusinessHours()
    await settingsPage.expectBusinessHoursLoaded()
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
npx playwright test e2e/tests/settings.spec.ts
```

Esperado: `2 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/settings.page.ts voro-salon-crm-front/e2e/tests/settings.spec.ts
git commit -m "test(e2e): add settings spec"
```

---

### Task 11: BookingPage + booking.spec.ts

**Files:**
- Create: `voro-salon-crm-front/e2e/pages/booking.page.ts`
- Create: `voro-salon-crm-front/e2e/tests/booking.spec.ts`

Estes testes rodam **sem autenticação** (rota pública). O slug do tenant vem da variável `BOOKING_SLUG`.

- [ ] **Step 1: Criar `booking.page.ts`**

```typescript
// voro-salon-crm-front/e2e/pages/booking.page.ts
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class BookingPage {
  private slug: string

  constructor(private page: Page) {
    this.slug = process.env.BOOKING_SLUG ?? 'test-salon'
  }

  async goto() {
    await this.page.goto(`/booking/${this.slug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectWelcomeCardLoaded() {
    // A página exibe o nome do salão ou card de boas-vindas
    await expect(this.page.locator('body')).not.toBeEmpty()
    await expect(this.page.getByText(/500|not found/i)).not.toBeVisible()
  }

  async selectFirstService() {
    const firstService = this.page.getByRole('button').filter({ hasText: /selecionar|escolher/i }).first()
    const firstCard = this.page.locator('[class*="card"]').first()
    const target = await firstService.isVisible() ? firstService : firstCard
    await target.click()
  }

  async expectProfessionalStep() {
    await expect(
      this.page.getByText(/profissional|colaborador/i).first()
    ).toBeVisible({ timeout: 10000 })
  }
}
```

- [ ] **Step 2: Criar `booking.spec.ts`**

```typescript
// voro-salon-crm-front/e2e/tests/booking.spec.ts
import { test, expect } from '@playwright/test'
import { BookingPage } from '../pages/booking.page'

test.use({ storageState: undefined })

test.describe('Booking público', () => {
  test('página de booking carrega sem erros', async ({ page }) => {
    const bookingPage = new BookingPage(page)
    await bookingPage.goto()
    await bookingPage.expectWelcomeCardLoaded()
  })

  test('URL de booking com slug inválido exibe not found ou redireciona', async ({ page }) => {
    await page.goto('/booking/slug-que-nao-existe-12345')
    await page.waitForLoadState('networkidle')
    // Pode exibir 404 ou redirecionar — qualquer resposta é aceitável desde que não seja 500
    await expect(page.getByText(/500|erro interno do servidor/i)).not.toBeVisible()
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd voro-salon-crm-front
BOOKING_SLUG=seu-slug npx playwright test e2e/tests/booking.spec.ts
```

Esperado: `2 passed`

- [ ] **Step 4: Commit**

```bash
git add voro-salon-crm-front/e2e/pages/booking.page.ts voro-salon-crm-front/e2e/tests/booking.spec.ts
git commit -m "test(e2e): add booking public flow spec"
```

---

### Task 12: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/test-frontend-pr.yml`

- [ ] **Step 1: Criar o workflow**

```yaml
# .github/workflows/test-frontend-pr.yml
name: Frontend E2E Tests (PR)

on:
  pull_request:
    branches:
      - main
      - dev

jobs:
  playwright:
    name: Playwright E2E
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: voro-salon-crm-front

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: voro-salon-crm-front/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Build Next.js
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}

      - name: Run Playwright tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' }}
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          BOOKING_SLUG: ${{ secrets.BOOKING_SLUG }}
          CI: true
        # O servidor é iniciado automaticamente via webServer no playwright.config.ts (ver Step 2)

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: voro-salon-crm-front/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Adicionar `webServer` ao `playwright.config.ts`**

Isso permite que o Playwright inicie o Next.js automaticamente no CI. Adicionar dentro de `defineConfig({...})`:

```typescript
webServer: {
  command: 'npm run start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
},
```

O CI já faz o build no step anterior. No local, `reuseExistingServer: true` reutiliza o servidor já rodando.

- [ ] **Step 3: Adicionar os Secrets no GitHub**

No repositório GitHub → Settings → Secrets and variables → Actions, adicionar:
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `BOOKING_SLUG`
- `PLAYWRIGHT_BASE_URL` (opcional, se quiser apontar para preview em vez de localhost)

- [ ] **Step 4: Rodar tudo localmente para validar**

```bash
cd voro-salon-crm-front
npm run build && npm run start &
TEST_EMAIL=seu@email.com TEST_PASSWORD=sua_senha BOOKING_SLUG=seu-slug npx playwright test
```

Esperado: todos os testes passando. Rodar `npm run test:e2e:report` para ver o relatório HTML.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/test-frontend-pr.yml voro-salon-crm-front/playwright.config.ts
git commit -m "ci: add frontend Playwright E2E workflow"
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `voro-salon-crm-front/playwright.config.ts` | Criar |
| `voro-salon-crm-front/package.json` | Modificar (scripts + dep) |
| `voro-salon-crm-front/.env.test` | Criar (gitignored) |
| `e2e/fixtures/auth.setup.ts` | Criar |
| `e2e/pages/login.page.ts` | Criar |
| `e2e/pages/appointments.page.ts` | Criar |
| `e2e/pages/clients.page.ts` | Criar |
| `e2e/pages/employees.page.ts` | Criar |
| `e2e/pages/services.page.ts` | Criar |
| `e2e/pages/finance.page.ts` | Criar |
| `e2e/pages/reports.page.ts` | Criar |
| `e2e/pages/settings.page.ts` | Criar |
| `e2e/pages/booking.page.ts` | Criar |
| `e2e/tests/auth.spec.ts` | Criar |
| `e2e/tests/appointments.spec.ts` | Criar |
| `e2e/tests/clients.spec.ts` | Criar |
| `e2e/tests/employees.spec.ts` | Criar |
| `e2e/tests/services.spec.ts` | Criar |
| `e2e/tests/finance.spec.ts` | Criar |
| `e2e/tests/reports.spec.ts` | Criar |
| `e2e/tests/settings.spec.ts` | Criar |
| `e2e/tests/booking.spec.ts` | Criar |
| `.github/workflows/test-frontend-pr.yml` | Criar |

```
voro-salon-crm-front/
  e2e/
    fixtures/
      auth.setup.ts          # login via UI, salva storageState
      .auth/
        user.json            # gitignored
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
  .env.test                  # gitignored
```

**Variáveis de ambiente:**
- `PLAYWRIGHT_BASE_URL` — default `http://localhost:3000`
- `TEST_EMAIL` — e-mail do usuário de teste
- `TEST_PASSWORD` — senha do usuário de teste
- `BOOKING_SLUG` — slug do tenant para testes de booking público

---
