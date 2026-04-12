"use client"

import { useReducedMotion, motion } from "framer-motion"
import { LegalHeader } from "@/components/legal/legal-header"
import { LegalFooter } from "@/components/legal/legal-footer"

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

function useViewportVariants(once = true) {
  const shouldReduce = useReducedMotion()
  return {
    initial: shouldReduce ? "visible" : "hidden",
    whileInView: "visible",
    viewport: { once, margin: "-60px" as const },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  const vp = useViewportVariants()

  return (
    <>
      <LegalHeader />
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

          {/* Hero */}
          <motion.div variants={stagger} {...vp} className="mb-12">
            <motion.div variants={fadeUp} className="mb-4">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Última atualização: 02 de abril de 2026
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
            >
              Política de Privacidade
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed max-w-2xl">
              A VoroLabs se compromete a proteger a privacidade dos dados dos nossos usuários e dos
              clientes dos estabelecimentos que utilizam a plataforma Voro Salon. Esta política
              descreve quais dados coletamos, como os utilizamos e quais são seus direitos.
            </motion.p>
          </motion.div>

          {/* Sections */}
          <motion.div variants={stagger} {...vp} className="space-y-0">

            {/* 1 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                1. Dados que Coletamos
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Coletamos as informações necessárias para fornecer e melhorar nossos serviços:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Dados de identificação:</strong> nome completo e
                  razão social do estabelecimento.
                </li>
                <li>
                  <strong className="text-foreground">Dados de contato:</strong> endereço de e-mail e
                  número de telefone/WhatsApp.
                </li>
                <li>
                  <strong className="text-foreground">Dados de pagamento:</strong> informações de
                  cobrança processadas via Mercado Pago; não armazenamos dados de cartão de crédito
                  em nossos servidores.
                </li>
                <li>
                  <strong className="text-foreground">Dados de uso:</strong> logs de acesso, endereço
                  IP, tipo de dispositivo, páginas visitadas e funcionalidades utilizadas.
                </li>
                <li>
                  <strong className="text-foreground">Dados de clientes do estabelecimento:</strong>{" "}
                  nome, telefone e histórico de agendamentos inseridos pelos próprios usuários da
                  plataforma.
                </li>
                <li>
                  <strong className="text-foreground">Cookies e tecnologias similares:</strong>{" "}
                  conforme descrito na nossa Política de Cookies.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 2 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Como Usamos seus Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Utilizamos seus dados para as seguintes finalidades:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Criação, manutenção e gestão da sua conta na plataforma.</li>
                <li>
                  Processamento de pagamentos e emissão de cobranças relacionadas à sua assinatura.
                </li>
                <li>
                  Melhoria contínua dos recursos e da experiência de uso da plataforma.
                </li>
                <li>
                  Envio de comunicações transacionais (confirmações, alertas, suporte técnico).
                </li>
                <li>
                  Envio de comunicações de marketing, desde que você tenha dado consentimento
                  explícito ou nas hipóteses permitidas pela LGPD.
                </li>
                <li>Cumprimento de obrigações legais e regulatórias.</li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 3 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                3. Compartilhamento de Dados
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Não vendemos nem alugamos seus dados pessoais a terceiros. Podemos compartilhá-los
                apenas nas seguintes circunstâncias:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Mercado Pago:</strong> processador de pagamentos
                  utilizado para cobranças de assinatura, sujeito à própria política de privacidade.
                </li>
                <li>
                  <strong className="text-foreground">Infraestrutura de nuvem:</strong> AWS e Vercel,
                  utilizados para hospedagem, armazenamento e entrega de conteúdo.
                </li>
                <li>
                  <strong className="text-foreground">Obrigações legais:</strong> quando exigido por
                  lei, ordem judicial ou autoridade competente.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 4 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                4. Armazenamento e Segurança
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Adotamos medidas técnicas e organizacionais para proteger seus dados:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Transmissão de dados protegida por criptografia TLS/HTTPS em todos os pontos de
                  acesso.
                </li>
                <li>
                  Dados armazenados em servidores gerenciados pela AWS e Vercel, com controles de
                  acesso rigorosos.
                </li>
                <li>
                  Senhas armazenadas como hashes usando algoritmos modernos (bcrypt); nunca em texto
                  simples.
                </li>
                <li>
                  Dados de conta são retidos durante a vigência da assinatura e por até 90 dias após
                  o cancelamento, após o qual são excluídos ou anonimizados.
                </li>
                <li>
                  Logs de auditoria são mantidos por até 12 meses para fins de segurança.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 5 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                5. Seus Direitos (LGPD)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem
                os seguintes direitos em relação aos seus dados pessoais:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Acesso:</strong> solicitar confirmação sobre o
                  tratamento e cópia dos seus dados.
                </li>
                <li>
                  <strong className="text-foreground">Correção:</strong> solicitar a correção de dados
                  incompletos, inexatos ou desatualizados.
                </li>
                <li>
                  <strong className="text-foreground">Exclusão:</strong> solicitar a eliminação dos
                  dados tratados com base no consentimento.
                </li>
                <li>
                  <strong className="text-foreground">Portabilidade:</strong> receber seus dados em
                  formato estruturado e legível por máquina.
                </li>
                <li>
                  <strong className="text-foreground">Revogação de consentimento:</strong> retirar o
                  consentimento a qualquer momento, sem prejuízo à licitude do tratamento anterior.
                </li>
                <li>
                  <strong className="text-foreground">Oposição:</strong> opor-se ao tratamento
                  realizado sem base em consentimento, em caso de descumprimento da LGPD.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Para exercer qualquer desses direitos, entre em contato pelo e-mail{" "}
                <a
                  href="mailto:contato@vorolabs.app"
                  className="text-primary underline underline-offset-4"
                >
                  contato@vorolabs.app
                </a>
                .
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 6 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Utilizamos cookies e tecnologias similares para garantir o funcionamento da plataforma
                e melhorar sua experiência. Para informações detalhadas sobre os tipos de cookies
                utilizados e como gerenciá-los, consulte nossa{" "}
                <a href="/cookies" className="text-primary underline underline-offset-4">
                  Política de Cookies
                </a>
                .
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 7 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Menores de Idade</h2>
              <p className="text-muted-foreground leading-relaxed">
                A plataforma Voro Salon é destinada exclusivamente a pessoas jurídicas e maiores de 18
                anos que operam estabelecimentos de beleza. Não coletamos intencionalmente dados de
                menores de 18 anos. Se tivermos conhecimento de que dados de um menor foram coletados
                sem o devido consentimento dos responsáveis, tomaremos as medidas cabíveis para
                excluí-los.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 8 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Em caso de dúvidas, solicitações ou reclamações relacionadas a esta Política de
                Privacidade, entre em contato com o nosso Encarregado de Proteção de Dados (DPO):
              </p>
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-border">
                <p className="text-sm text-foreground font-medium">VoroLabs</p>
                <p className="text-sm text-muted-foreground">
                  E-mail:{" "}
                  <a
                    href="mailto:contato@vorolabs.app"
                    className="text-primary underline underline-offset-4"
                  >
                    contato@vorolabs.app
                  </a>
                </p>
              </div>
            </motion.section>

          </motion.div>
        </div>
      </main>
      <LegalFooter />
    </>
  )
}
