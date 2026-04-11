# Tasks

## [x] Validar a anamnese
- Investigar como está implementada atualmente
- Verificar o fluxo completo: criação, exibição e edição
- Identificar e corrigir eventuais problemas

## [x] Criar página para o cliente preencher e assinar a ficha de anamnese
- Nova página `/anamnesis/fill/[token]` — cliente preenche as perguntas + assina
- Backend: `CreateFillRequestAsync` cria ficha Draft + token 72h; `GetFillSheetByTokenAsync` retorna perguntas; `FillAndSignAsync` salva respostas + assinatura e marca como Completed
- Novo endpoint autenticado: `POST /anamnesis/send-fill-request/{clientId}`
- Novos endpoints públicos: `GET /public/anamnesis/fill/{token}` e `POST /public/anamnesis/fill/{token}`
- Botão "Enviar para Preencher" na aba de anamnese do cliente → abre wa.me se bot não configurado
- Reutiliza campo `PublicToken` + `Status = Draft` sem migration adicional

## [x] Adicionar assinatura do cliente para concordar a anamnese
- Backend já tinha: geração de token (72h), página pública `/anamnesis/sign/[token]`, envio via bot WhatsApp
- Adicionado botão "Solicitar Assinatura" na página de detalhe da anamnese
- **Se bot configurado:** envia o link automaticamente via WhatsApp
- **Se não configurado:** abre wa.me com mensagem + link de assinatura pré-preenchida
- Se cliente já assinou, exibe badge "Cliente assinou" no lugar do botão

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
