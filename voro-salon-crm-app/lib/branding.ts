export const SERVICE_PLACEHOLDERS: Record<number, { name: string; observations: string }> = {
  0: { // Salon
    name: "Ex: Corte Feminino, Coloração, Escova",
    observations: "Ex: Franja mais curta, mechas douradas...",
  },
  1: { // Barber
    name: "Ex: Corte Masculino, Barba, Pigmentação",
    observations: "Ex: Cabelo curto nas laterais, barba desenhada...",
  },
  2: { // NailsAndLashes
    name: "Ex: Manicure, Pedicure, Alongamento",
    observations: "Ex: Unhas em gel, francesinha, nail art...",
  },
  3: { // Aesthetics
    name: "Ex: Limpeza de Pele, Depilação, Massagem",
    observations: "Ex: Pele sensível, evitar cera quente...",
  },
  4: { // Spa
    name: "Ex: Massagem Relaxante, Pedras Quentes",
    observations: "Ex: Pressão suave, focar nas costas...",
  },
  5: { // Doctor / Health
    name: "Ex: Consulta Cardiológica, Retorno",
    observations: "Ex: Trazer exames anteriores...",
  },
  6: { // Dentist
    name: "Ex: Limpeza, Clareamento, Canal",
    observations: "Ex: Sensibilidade no dente 24...",
  },
  99: { // Other
    name: "Ex: Consulta, Sessão, Serviço",
    observations: "Ex: Observações gerais...",
  },
}

export function getServicePlaceholders(type: number = 0) {
  return SERVICE_PLACEHOLDERS[type] ?? SERVICE_PLACEHOLDERS[0]
}
