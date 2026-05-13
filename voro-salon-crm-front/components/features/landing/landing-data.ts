import { Calendar, Users, Scissors, Wallet, ClipboardList, BarChart3, Zap } from "lucide-react"

export const TESTIMONIALS = [
  {
    name: "Camila Ferreira",
    meta: "Salão com 3 profissionais · São Paulo/SP",
    avatar: "CF",
    result: "De 5 faltas para 1 por semana no 1º mês",
    text: "Antes eu perdia umas 3 a 5 clientes por semana que simplesmente sumiam. Com o Voro, o lembrete automático no WhatsApp resolveu isso. Faturei R$ 1.200 a mais só no primeiro mês.",
    stars: 5,
  },
  {
    name: "Juliana Matos",
    meta: "Salão com 4 profissionais · Campinas/SP",
    avatar: "JM",
    result: "5h economizadas por semana em ligações",
    text: "Eu ficava no celular marcando horário a semana toda. Hoje o sistema faz tudo sozinho — o cliente agenda pelo link e já recebe confirmação. Sobrou tempo pra atender mais.",
    stars: 5,
  },
  {
    name: "Bruna Oliveira",
    meta: "Autônoma · Curitiba/PR",
    avatar: "BO",
    result: "+R$ 2.400/mês depois de 60 dias",
    text: "O financeiro integrado me mostrou que eu estava cobrando barato e perdia dinheiro com faltas. Reajustei os preços, reduzi os no-shows e o lucro subiu muito mais do que esperava.",
    stars: 5,
  },
  {
    name: "Renata Costa",
    meta: "Salão com 2 profissionais · Belo Horizonte/MG",
    avatar: "RC",
    result: "Reduziu no-show em 70% em 3 semanas",
    text: "Tentei outros sistemas mas eram complicados demais. O Voro configurei em uma tarde e já no primeiro mês as clientes pararam de furar. Indico pra todo mundo.",
    stars: 5,
  },
  {
    name: "Fernanda Lima",
    meta: "Salão com 6 profissionais · Fortaleza/CE",
    avatar: "FL",
    result: "Agenda cheia sem precisar ligar",
    text: "A gente tinha uma pessoa quase que dedicada a confirmar horário por telefone. Agora o WhatsApp automático do Voro faz isso e essa pessoa passou a atender clientes.",
    stars: 4,
  },
  {
    name: "Ana Paula Souza",
    meta: "Autônoma · Porto Alegre/RS",
    avatar: "AP",
    result: "+R$ 800/mês só recuperando faltas",
    text: "No começo duvidei, mas testei os 14 dias grátis e as faltas caíram logo. Calculei que recupero em média R$ 800 por mês que antes simplesmente sumia da minha agenda.",
    stars: 5,
  },
]

export const FEATURES = [
  { icon: Calendar, label: "Agendamentos online" },
  { icon: Users, label: "Gestão de clientes" },
  { icon: Scissors, label: "Catálogo de serviços" },
  { icon: Users, label: "Controle de funcionários" },
  { icon: Wallet, label: "Financeiro integrado" },
  { icon: ClipboardList, label: "Ficha de anamnese" },
  { icon: BarChart3, label: "Relatórios e métricas" },
  { icon: Zap, label: "Acesso pelo celular" },
]

export function buildFaq(productName: string, establishmentLabel: string) {
  return [
    {
      q: "Posso cancelar a qualquer momento?",
      a: "Sim. Você pode cancelar sua assinatura a qualquer momento sem multa. O acesso fica ativo até o fim do período pago.",
    },
    {
      q: "Como funciona o pagamento?",
      a: "O pagamento é mensal e recorrente via MercadoPago. Aceitamos cartão de crédito, débito e Pix.",
    },
    {
      q: "Posso mudar de plano depois?",
      a: "Sim! Entre em contato conosco e faremos o ajuste pro-rata na sua próxima fatura.",
    },
    {
      q: `Os dados do meu ${establishmentLabel} ficam seguros?`,
      a: "Sim. Todos os dados são criptografados e armazenados com segurança. Somente você tem acesso.",
    },
    {
      q: "Preciso instalar algum programa?",
      a: `Não. O ${productName} funciona direto no navegador e também tem aplicativo para iOS e Android.`,
    },
  ]
}
