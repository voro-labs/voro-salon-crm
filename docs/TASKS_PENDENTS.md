# Tarefas Pendentes

---

## 1. Unificação de Clientes Duplicados

**Objetivo:** Permitir que o usuário una dois ou mais registros de cliente que representam a mesma pessoa, consolidando o histórico de agendamentos, serviços e dados cadastrais em um único registro.

**Contexto:** Clientes são criados com variações de nome (maiúsculas/minúsculas, abreviações, erros de digitação), gerando duplicatas que fragmentam o histórico e dificultam a gestão.

### Backend
- Criar endpoint `POST /api/v1/clients/merge` que recebe `{ primaryClientId: Guid, secondaryClientIds: Guid[] }`
- O serviço deve:
  - Reatribuir todos os agendamentos, registros de serviço, transações e anamneses do(s) cliente(s) secundário(s) para o cliente principal
  - Mesclar campos opcionais (phone, email, notes) do secundário no primário quando o primário estiver vazio
  - Soft-delete os clientes secundários após a migração
  - Retornar o cliente principal atualizado com o total de registros migrados

### Frontend
- Na página de detalhes do cliente (`/clients/[id]`): adicionar botão "Unificar com outro cliente"
- Abrir um dialog/drawer com:
  - Campo de busca para encontrar o cliente duplicado
  - Preview lado a lado dos dois clientes (nome, telefone, e-mail, qtd. de agendamentos)
  - Seleção de qual será o registro **principal** (a manter) e qual será o **secundário** (a remover)
  - Aviso claro: "Os agendamentos do cliente secundário serão movidos para o principal. O cliente secundário será removido."
  - Botão de confirmação com alert dialog de segunda confirmação

---

## 2. Motivo de Cancelamento de Agendamento

**Objetivo:** Ao cancelar um agendamento, exigir (ou opcionalmente solicitar) que o usuário informe o motivo do cancelamento, permitindo análise posterior das causas de cancelamento.

**Contexto:** Atualmente o cancelamento é imediato sem registro de justificativa, impossibilitando identificar padrões (ex: cliente faltou, reagendou, serviço indisponível).

### Backend
- Adicionar campo `CancellationReason string?` e `CancelledAt DateTimeOffset?` na entidade `Appointment` + migration
- Atualizar `UpdateStatusAsync` (ou criar `CancelAsync`) para aceitar o motivo e gravá-lo junto com o status `Cancelled`
- Expor `cancellationReason` e `cancelledAt` no `AppointmentDto`
- Endpoint sugerido: `PATCH /api/v1/appointments/{id}/cancel` com body `{ reason: string? }`

### Frontend
- Na página de detalhes do agendamento (`/appointments/[id]`): ao clicar em "Cancelar", abrir um dialog em vez de cancelar direto
- O dialog deve conter:
  - Select com motivos pré-definidos: `"Cliente não compareceu"`, `"Solicitado pelo cliente"`, `"Profissional indisponível"`, `"Erro de agendamento"`, `"Outro"`
  - Textarea para motivo livre (obrigatório quando selecionar "Outro", opcional nos demais)
  - Botão "Confirmar Cancelamento" (envia o status + motivo) e "Voltar"
- Exibir o motivo registrado no card/detalhe do agendamento quando status for `Cancelado`
- Incluir coluna/campo `Motivo` no export CSV/Excel dos agendamentos
