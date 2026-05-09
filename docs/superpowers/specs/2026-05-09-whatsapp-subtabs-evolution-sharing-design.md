# WhatsApp Sub-tabs + Compartilhamento de Instância Evolution

**Data:** 2026-05-09
**Status:** Draft

## Índice

1. [Contexto](#contexto)
2. [Feature 1 — Sub-tabs WhatsApp](#feature-1--sub-tabs-whatsapp)
3. [Feature 2 — Melhorias na seção Evolution](#feature-2--melhorias-na-seção-evolution)
4. [Feature 3 — Compartilhamento de instância](#feature-3--compartilhamento-de-instância)
5. [Arquitetura e componentes afetados](#arquitetura-e-componentes-afetados)
6. [Fora de escopo](#fora-de-escopo)

---

## Contexto

A tab WhatsApp nas configurações (`/settings?tab=whatsapp`) exibe os dois canais — API Oficial Meta e Evolution Go — num único card, o que torna as informações confusas e dificulta a configuração de cada canal. Além disso, cada tenant precisa criar sua própria instância Evolution, mesmo quando o mesmo usuário gerencia múltiplos estabelecimentos e poderia compartilhar uma única instância entre eles.

Este design cobre três melhorias relacionadas:

1. **Reestruturação em sub-tabs** — dividir a tab WhatsApp em duas sub-tabs (Evolution Go / API Oficial Meta) com exclusividade mútua.
2. **Melhorias na seção Evolution** — trazer o conteúdo da página separada para dentro da sub-tab, com status visual rico, ações inline e estado vazio melhorado.
3. **Compartilhamento de instância** — permitir que um usuário com acesso a múltiplos tenants vincule a instância Evolution de um estabelecimento a outro, em vez de criar uma instância por tenant.

---

## Feature 1 — Sub-tabs WhatsApp

### Estrutura da UI

A tab WhatsApp (`TabsContent value="whatsapp"`) passa a ter dois níveis:

```
Tab WhatsApp
├── Seção compartilhada: Configurações do Bot
│   ├── Toggle: Agendamento pelo WhatsApp
│   ├── Link: Templates de mensagem
│   └── Botão: Salvar
└── Sub-tabs (Tabs internos)
    ├── Sub-tab: Evolution Go
    │   └── [ver Feature 2]
    └── Sub-tab: API Oficial Meta
        └── [conteúdo atual do card Meta API]
```

### Exclusividade mútua

- Se a instância Evolution estiver conectada (`effectiveStatus === 2`) **ou** vinculada (link ativo), a sub-tab "API Oficial Meta" fica desabilitada.
- Se a API Oficial estiver conectada (`onboardingStatus?.connected === true`), a sub-tab "Evolution Go" fica desabilitada.
- Sub-tab desabilitada: aparência cinza, `pointer-events: none`, com tooltip `"[Canal] ativo — desconecte para usar o outro canal"`.
- Se nenhum canal estiver ativo, ambas as sub-tabs ficam habilitadas e o usuário escolhe qual configurar.

### Sub-tab API Oficial Meta

Recebe todo o conteúdo do bloco atual de "Opção 1: API Oficial Meta":
- Status de conexão (badge, ícone, número, expiração de token).
- Botão "Conectar" (Embedded Signup) ou "Desconectar".
- Campos avançados: Phone Number ID e Business Account ID (visíveis apenas quando desconectado).

### Eliminação da página separada de Evolution

A página `/settings/whatsapp/evolution/page.tsx` é removida. Todo o seu conteúdo migra para a sub-tab Evolution Go dentro de `/settings/page.tsx`.

---

## Feature 2 — Melhorias na seção Evolution

### Estados do card de instância

#### Estado: sem instância, sem disponíveis para vincular (primeiro acesso)

- Ícone centralizado + texto: "Nenhuma instância criada".
- Descrição curta: "Crie uma instância Evolution Go para conectar um número WhatsApp ao bot."
- Botão primário: "+ Criar instância" → chama `POST /evolution-instances` diretamente.

#### Estado: sem instância, com instâncias disponíveis para vincular

- Mesmo layout do estado anterior, mas botão muda para "+ Criar / Vincular instância".
- Ao clicar, abre **Modal de escolha** (ver Feature 3).

#### Estado: instância própria conectada

Card com borda e fundo esverdeado:
- Indicador "● Conectado" em verde + número de telefone em destaque.
- `instanceId` em fonte monospace menor abaixo.
- Data de conexão.
- Ações visíveis diretamente no card (sem abrir dialog separado):
  - Botão "Conectar via QR" — ao clicar, expande área inline com QR code; polling a cada 3 s; fecha automaticamente ao conectar.
  - Botão "Conectar via Código" — expande área inline com input de telefone + exibição do código de pareamento; polling de status.
  - Botão "Desconectar" (destructive outline) — chama `POST /evolution-instances/{id}/disconnect`.
  - Botão "Excluir instância" (destructive outline, alinhado à direita) — confirmação via Dialog pequeno antes de `DELETE /evolution-instances/{id}`.

#### Estado: instância própria desconectada ou conectando

- Card com borda neutra.
- Badge de status: "Desconectado" ou "Conectando" (com spinner).
- Botões de QR e Código visíveis.
- Botão "Excluir instância" visível.

#### Estado: instância compartilhada (vinculada de outro tenant)

Card com borda e fundo esverdeado (se conectada) ou neutro (se desconectada):
- Badge azul "🔗 Compartilhada" no canto superior direito.
- Texto menor: "de: [Nome do estabelecimento dono]".
- Telefone e status normais.
- **Sem** botões de QR, Código, Desconectar ou Excluir — essas ações são exclusivas do tenant dono.
- Botão "Desvincular" (outline destructive) → `DELETE /evolution-instances/link`.

### Polling de status ao vivo

Mantém o comportamento atual: polling a cada 20 s em background enquanto a sub-tab estiver visível. Ao expandir QR ou Código inline, polling adicional a cada 3 s específico para aquela operação, interrompido ao fechar ou conectar.

---

## Feature 3 — Compartilhamento de instância

### Modelo de dados

Nova entidade de domínio:

```csharp
public class TenantEvolutionInstanceLink
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Tenant não-dono que está vinculado a esta instância.</summary>
    public Guid TenantId { get; set; }

    /// <summary>Instância Evolution de outro tenant que está sendo compartilhada.</summary>
    public Guid InstanceId { get; set; }

    public DateTimeOffset LinkedAt { get; set; } = DateTimeOffset.UtcNow;

    public Tenant Tenant { get; set; } = null!;
    public TenantEvolutionInstance Instance { get; set; } = null!;
}
```

**Constraints:**
- Unique index em `TenantId` — cada tenant pode ter no máximo um link ativo.
- Um tenant não pode ter `TenantEvolutionInstance` própria E `TenantEvolutionInstanceLink` ao mesmo tempo; validado na camada de serviço.
- Um tenant não pode vincular a própria instância a si mesmo.

### Resolução de instância no serviço

`EvolutionInstanceService` passa a usar um método de resolução unificado:

```
ResolveInstanceAsync(tenantId):
  1. Busca TenantEvolutionInstance onde TenantId = tenantId → retorna com flag IsOwned = true
  2. Se não encontrar, busca TenantEvolutionInstanceLink onde TenantId = tenantId
     → resolve para a TenantEvolutionInstance do link → retorna com flag IsOwned = false
  3. Se nenhum → retorna null
```

`IsOwned = false` instrui o serviço a bloquear operações de delete, disconnect e QR/pair — somente o tenant dono pode executar essas ações.

### Novos endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/evolution-instances/available-to-link` | Lista instâncias disponíveis para vincular (dos outros tenants do usuário logado) |
| `POST` | `/api/v1/evolution-instances/link` | Vincula instância de outro tenant ao tenant atual |
| `DELETE` | `/api/v1/evolution-instances/link` | Remove vínculo do tenant atual |

**`GET available-to-link`**

O controller passa o `userId` via claim. O serviço:
1. Busca todos os `TenantId` acessíveis pelo usuário (via tabela de memberships existente).
2. Exclui o tenant atual.
3. Para cada tenant restante, verifica se tem `TenantEvolutionInstance` própria.
4. Exclui instâncias que o tenant atual já tenha vinculada.
5. Retorna: `[{ instanceId, tenantName, phoneNumber, status }]`.

**`POST link`**

Body: `{ instanceId: Guid }`. Valida:
- O usuário tem acesso ao tenant dono da instância.
- O tenant atual não tem instância própria.
- O tenant atual não tem outro link ativo.

**`DELETE link`**

Remove o `TenantEvolutionInstanceLink` do tenant atual. Sem body.

### UX — Modal de escolha ao criar/vincular

Ao clicar em "+ Criar / Vincular instância" no estado vazio (quando há instâncias disponíveis):

```
Dialog: "Configurar instância Evolution"
├── Opção: ○ Criar nova instância
└── Opção: ○ Vincular: [Nome do estab] — +55 11 99999-0000 (Conectado)
    (uma linha por instância disponível)

Botão: "Confirmar" → se "criar": POST /evolution-instances
                    se "vincular": POST /evolution-instances/link { instanceId }
```

A lista de opções de vínculo vem de `GET /available-to-link`. O modal carrega esse endpoint ao abrir e exibe skeleton enquanto carrega.

### Roteamento do webhook com instância compartilhada

Quando chega mensagem no webhook Evolution (`POST /api/v1/whatsapp/evolution-webhook`):

1. Identifica a instância pelo token/instanceId do payload.
2. Busca o tenant dono (`TenantEvolutionInstance.TenantId`).
3. Busca todos os tenants vinculados (`TenantEvolutionInstanceLink` onde `InstanceId = instanceId`).
4. Monta a lista `[tenantDono, ...tenantsVinculados]`.
5. Se a lista tiver mais de um tenant, aciona o fluxo de menu multi-estabelecimento (já existente para a API Oficial) — o cliente recebe: "Qual estabelecimento deseja? 1 - X, 2 - Y...".
6. Se a lista tiver só um tenant, segue o fluxo atual de tenant único.

---

## Arquitetura e componentes afetados

### Backend (C# / .NET)

| Componente | Mudança |
|---|---|
| `TenantEvolutionInstanceLink` | Nova entidade de domínio |
| `ITenantEvolutionInstanceLinkRepository` | Nova interface + implementação |
| `IEvolutionInstanceService` | Novos métodos: `GetAvailableToLinkAsync`, `LinkAsync`, `UnlinkAsync`; resolução unificada com flag `IsOwned` |
| `EvolutionInstanceService` | Implementação dos novos métodos + lógica de resolução |
| `EvolutionInstanceController` | Novos endpoints: `available-to-link`, `link` (POST/DELETE) |
| Webhook handler Evolution | Buscar tenants vinculados ao receber mensagem; acionar menu multi-tenant quando `count > 1` |
| Migration EF Core | Criação da tabela `TenantEvolutionInstanceLinks` com unique index em `TenantId` |

### Frontend (Next.js)

| Arquivo | Mudança |
|---|---|
| `app/settings/page.tsx` | Reestruturar tab WhatsApp: seção Bot compartilhada + sub-tabs Evolution / API Oficial; trazer todo conteúdo Evolution inline; lógica de exclusividade mútua |
| `app/settings/whatsapp/evolution/page.tsx` | **Removido** |
| `lib/api.ts` (endpoints) | Adicionar: `EVOLUTION_AVAILABLE_TO_LINK`, `EVOLUTION_LINK` |

---

## Fora de escopo

- Compartilhamento de instância entre usuários de tenants diferentes (sem acesso mútuo) — requer sistema de convites, fora deste design.
- Múltiplas instâncias próprias por tenant — limite de 1 instância própria por tenant permanece.
- Migração automática de instâncias existentes para o modelo de link — apenas novas vinculações.
- Notificações quando o dono da instância desconectar ou excluir uma instância compartilhada — pode ser adicionado posteriormente.
- Testes automatizados — tratados separadamente seguindo o padrão do projeto.
