# Tasks

## [ ] Validar a anamnese
- Investigar como está implementada atualmente
- Verificar o fluxo completo: criação, exibição e edição
- Identificar e corrigir eventuais problemas

## [x] Adicionar data de aniversário do cliente na página de [id]
- Campo `birthDate` já existia no banco e no formulário de edição
- Adicionado exibição do aniversário (dia e mês) no card de info do cliente com ícone de bolo

## [x] Adicionar selects com pesquisa na tela de edição de agendamento
- Substituídos os selects de Cliente, Serviço e Funcionário pelo componente `SearchableSelect`
- Mantida lógica de `handleServiceChange` para o serviço e `isFormLocked` para todos

## [x] Validar funcionamento de "Solicitar Avaliação"
- `SendRatingRequestAsync` agora verifica `tenant.UseWhatsappBooking && WhatsappPhoneNumberId`
- **Se bot configurado:** envia o template `service_rating_request_1` via API do WhatsApp
- **Se bot não configurado:** retorna `requiresManualSend: true` com telefone, nome do cliente e serviço
- Frontend detecta o flag e abre `wa.me` com mensagem pré-preenchida (igual ao padrão de notificações de status)
