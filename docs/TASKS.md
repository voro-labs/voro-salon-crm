# Tarefas - Agendamento: Melhoria de Interface, Bug de Duração e Persistência de Serviços

## Contexto

Os formulários de agendamento (`/appointments/new` e `/appointments/[id]`) precisam de melhorias visuais na seleção de cliente/serviços/funcionário, correção do bug de duração com múltiplos serviços, e implementação do salvamento dos serviços na tabela `AppointmentServices`.

---

## Task 1: Melhorar a interface de seleção de Cliente / Serviços / Funcionário

**Arquivos**: `app/appointments/new/page.tsx`, `app/appointments/[id]/page.tsx`

**Problema**: A forma atual de escolher serviços (grid de botões pequenos) ficou ruim visualmente. Cliente, serviços e funcionário estão misturados no mesmo grid sem separação clara.

**O que fazer**:
- [x] Separar visualmente as seções de Cliente, Serviços e Funcionário em blocos distintos (possivelmente com bordas/headers leves)
- [x] Melhorar o card de serviço: mostrar nome, preço e duração de forma mais legível, com melhor feedback visual ao selecionar
- [ ] Considerar agrupar serviços por categoria quando houver categoria definida
- [x] Melhorar o resumo de serviços selecionados (sticky ou mais destacado)
- [x] Aplicar as mesmas melhorias nas duas páginas (new e [id])

---

## Task 2: Bug - Duração não suporta cálculo com vários serviços

**Arquivos**: `app/appointments/new/page.tsx`, `app/appointments/[id]/page.tsx`

**Problema**: O `<Select>` de duração tem opções fixas de 15, 30, 45, 60, 90 e 120 minutos. Quando o usuário seleciona vários serviços cujo total de duração excede 120 min (ou cai em valor intermediário como 75 min), o `<Select>` não tem esse valor e não consegue mostrar a duração correta.

**O que fazer**:
- [x] Quando há serviços selecionados, calcular a duração total automaticamente e mostrar em um campo somente-leitura (ou label informativo) ao invés de depender do Select fixo
- [x] Permitir ao usuário sobrescrever manualmente se quiser (trocar para input numérico ou adicionar as opções faltantes dinamicamente)
- [x] Garantir que `form.durationMinutes` seja corretamente atualizado com o total dos serviços selecionados (a lógica no `toggleService` já faz isso, mas o Select não reflete quando o valor não está nas opções)
- [x] Aplicar nas duas páginas (new e [id])

---

## Task 3: Salvar serviços escolhidos na tabela AppointmentServices

**Arquivos backend**:
- `VoroSalonCrm.Application/DTOs/CRM/AppointmentDtos.cs`
- `VoroSalonCrm.Application/Services/AppointmentService.cs`
- `VoroSalonCrm.Domain/Entities/AppointmentService.cs` (entidade join table - JA EXISTE)
- `VoroSalonCrm.Domain/Entities/Appointment.cs` (propriedade `Services` - JA EXISTE)

**Arquivos frontend**:
- `hooks/use-appointment-form.hook.ts`
- `hooks/use-appointment-detail.hook.ts`
- `app/appointments/new/page.tsx`
- `app/appointments/[id]/page.tsx`

**Problema**: O frontend permite selecionar múltiplos serviços, mas envia apenas `serviceId` (um só) para a API. A tabela `AppointmentServices` já existe no banco mas nunca é populada. O DTO de criação/atualização não tem campo para lista de serviços.

**O que fazer**:

### Backend
- [x] Adicionar `List<Guid>? ServiceIds` ao `CreateAppointmentDto`
- [x] Adicionar `List<Guid>? ServiceIds` ao `UpdateAppointmentDto`
- [x] No `CreateAsync`, popular `appointment.Services` com os `ServiceIds` recebidos
- [x] No `UpdateAsync`, atualizar `AppointmentServices` (remover antigas, inserir novas)
- [x] Adicionar `List<AppointmentServiceDto>? Services` ao `AppointmentDto` para retornar os serviços
- [x] Criar `AppointmentServiceDto` com `ServiceId`, `ServiceName`, `Price`, `DurationMinutes`

### Frontend
- [x] No `use-appointment-form.hook.ts`, adicionar `serviceIds: string[]` ao form e enviar no POST
- [x] No `use-appointment-detail.hook.ts`, adicionar `serviceIds: string[]` ao form e enviar no PUT
- [x] Na página `new`, preencher `serviceIds` a partir de `selectedServices`
- [x] Na página `[id]`, inicializar `selectedServices` a partir de `appointment.services` (lista da API)

---

## Ordem de execução sugerida

1. **Task 2** (bug duração) - fix rápido e isolado
2. **Task 3** (persistência backend + frontend) - estrutural, precisa ser feito antes da UI
3. **Task 1** (melhoria visual) - pode ser feito por último com tudo funcionando