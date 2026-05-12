# Planejamento: Módulo de Pagamentos e Recebimento via PIX

Este documento descreve como implementar um sistema de cobrança automatizado para os agendamentos, permitindo que os salões recebam via PIX (com detecção automática) e outras formas de pagamento.

## Proposta Técnica

### 1. Modelo de Dados (Novas Entidades)

#### `Payment` (Entidade)
- `Id` (Guid)
- `TenantId` (Guid)
- `AppointmentId` (Guid) - Vínculo com o agendamento.
- `Amount` (Decimal)
- `Status` (Enum: `Pending`, `Paid`, `Expired`, `Refunded`)
- `PaymentMethod` (Enum: `PIX`, `CreditCard`, `DebitCard`)
- `GatewayReferenceId` (String) - ID do pagamento no provedor externo (ex: Asaas, Mercado Pago).
- `PixQrCodeBase64` (String) - Para exibir o QR Code.
- `PixCopyPaste` (String) - Para o cliente copiar e colar no banco.
- `PaidAt` (DateTimeOffset?)
- `CreatedAt`, `UpdatedAt`

#### `TenantPaymentConfig` (Entidade)
- `TenantId` (Guid)
- `Gateway` (Enum: `Asaas`, `MercadoPago`, `Efí`)
- `ApiKey` (Encrypted String)
- `WebhookSecret` (String)
- `IsActive` (Bool)

### 2. Integração com Gateway (Exemplo: Asaas ou Mercado Pago)

Para o PIX automático, utilizaremos uma API que suporte **PIX Dinâmico** e **Webhooks**.

- **Fluxo de Criação:**
  1. No momento do agendamento (WhatsApp ou Web), o sistema chama o `IPaymentService`.
  2. O serviço solicita ao Gateway a criação de uma cobrança PIX.
  3. O sistema salva o `Payment` no banco e retorna o QR Code/Link para o cliente.
- **Fluxo de Confirmação:**
  1. O Gateway envia um **Webhook** para o nosso servidor quando o pagamento é detectado.
  2. O `WebhookController` identifica o `GatewayReferenceId`.
  3. O sistema atualiza o `Payment` como `Paid` e o `Appointment` como `Confirmed`.

### 3. Alterações no Fluxo de Agendamento (WhatsApp)

1. No estado `AWAITING_CONFIRMATION`, após o usuário clicar em "Confirmar ✅":
2. O bot responde: *"Agendamento pré-confirmado! Para garantir sua vaga, realize o pagamento do PIX abaixo nas próximas 15 minutos."*
3. O bot envia o código **PIX Copia e Cola** e a imagem do **QR Code**.
4. O bot fica monitorando (ou aguarda o webhook) para enviar uma mensagem de confirmação final: *"Pagamento recebido! Seu agendamento está 100% confirmado. 🚀"*

### 4. Outras Formas de Pagamento

- **Cartão de Crédito:** O sistema pode gerar um link de checkout (Hosted Checkout) do provedor.
- **Detecção:** O mesmo sistema de Webhooks funcionaria para links de cartão.

## Perguntas Abertas

- **Taxas:** Você pretende repassar as taxas do gateway para o salão ou embutir no serviço?
- **Antecipação:** O salão deve receber o valor imediatamente ou o sistema deve gerenciar o saldo (Split de pagamento)?
- **Gateway de Preferência:** Você já tem algum gateway em mente (Asaas e Mercado Pago são os mais comuns para esse cenário no Brasil)?

## Plano de Verificação

### Testes Manuais
- Simular a criação de um agendamento e verificar se o PIX é gerado corretamente.
- Utilizar o ambiente de Sandbox do gateway para simular o pagamento e verificar se o status do agendamento muda automaticamente para `Confirmed`.
- Testar o comportamento quando o PIX expira sem pagamento.
