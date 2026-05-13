export const KANBAN_COLUMNS: { state: string; label: string; color: string; headerColor: string; description: string }[] = [
  { state: "START",                  label: "Novo Contato",            color: "border-slate-300",   headerColor: "bg-slate-100 text-slate-700",   description: "Visitante acabou de iniciar o fluxo de agendamento." },
  { state: "AWAITING_TENANT",        label: "Escolhendo Unidade",      color: "border-zinc-300",    headerColor: "bg-zinc-100 text-zinc-700",     description: "Está escolhendo qual unidade/estabelecimento quer atender." },
  { state: "AWAITING_SERVICE",       label: "Escolhendo Serviço",      color: "border-blue-300",    headerColor: "bg-blue-100 text-blue-700",     description: "Está selecionando o serviço desejado." },
  { state: "AWAITING_EMPLOYEE",      label: "Escolhendo Profissional", color: "border-violet-300",  headerColor: "bg-violet-100 text-violet-700", description: "Está escolhendo com qual profissional quer ser atendido." },
  { state: "AWAITING_DATE",          label: "Escolhendo Data",         color: "border-amber-300",   headerColor: "bg-amber-100 text-amber-700",   description: "Está navegando pelo calendário para escolher a data." },
  { state: "AWAITING_TIME",          label: "Escolhendo Horário",      color: "border-orange-300",  headerColor: "bg-orange-100 text-orange-700", description: "Está selecionando o horário disponível na data escolhida." },
  { state: "AWAITING_DESCRIPTION",   label: "Aguardando Descrição",    color: "border-purple-300",  headerColor: "bg-purple-100 text-purple-700", description: "Está preenchendo informações complementares (nome, observações)." },
  { state: "AWAITING_CONFIRMATION",  label: "Aguardando Confirmação",  color: "border-rose-300",    headerColor: "bg-rose-100 text-rose-700",     description: "Revisando o resumo do agendamento antes de confirmar." },
  { state: "AWAITING_REMINDER_TIME", label: "Definindo Lembrete",      color: "border-indigo-300",  headerColor: "bg-indigo-100 text-indigo-700", description: "Configurando quando quer receber o lembrete do agendamento." },
  { state: "COMPLETED",              label: "Agendado",                color: "border-emerald-300", headerColor: "bg-emerald-100 text-emerald-700", description: "Agendamento criado com sucesso via Bot, App ou Site." },
  { state: "ABANDONED",              label: "Abandonado",              color: "border-yellow-300",  headerColor: "bg-yellow-100 text-yellow-700",  description: "Visitante iniciou mas não completou o agendamento (sessão expirou)." },
  { state: "CANCELLED",              label: "Cancelado",               color: "border-gray-300",    headerColor: "bg-gray-100 text-gray-700",     description: "Agendamento cancelado pelo cliente ou estabelecimento." },
]
