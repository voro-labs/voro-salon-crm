# Tasks

## Pendentes

- [ ] **Enviar dados de rastreamento UTM/fbclid ao checkout**
  - Ao submeter o formulário de cadastro/checkout em `app/(landing)/prices/page.tsx`, ler `localStorage.getItem("voro_tracking")` e incluir os dados no payload enviado à API.
  - Os campos capturados são: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `captured_at`.
  - Verificar se o backend já aceita esses campos no endpoint de checkout ou se será necessário adicionar suporte.
  - Após o envio, limpar o `localStorage` (`localStorage.removeItem("voro_tracking")`).
