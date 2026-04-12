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

export default function RefundPage() {
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
              Política de Reembolso e Cancelamento
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed max-w-2xl">
              Nossa política foi elaborada para ser justa e transparente. Aqui você encontra todas as
              informações sobre períodos de teste, condições de reembolso e como cancelar sua
              assinatura.
            </motion.p>
          </motion.div>

          {/* Sections */}
          <motion.div variants={stagger} {...vp} className="space-y-0">

            {/* 1 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                1. Período de Teste
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A VoroLabs oferece um período de teste gratuito de <strong className="text-foreground">14 dias</strong>{" "}
                para todos os planos, sem a necessidade de informar dados de cartão de crédito.
                Durante esse período, você tem acesso completo às funcionalidades do plano escolhido e
                pode cancelar a qualquer momento sem qualquer custo. Ao final do período de teste, a
                assinatura não é renovada automaticamente — você escolhe se deseja contratar um plano
                pago.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 2 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Política de Reembolso
              </h2>

              <div className="space-y-6">

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Planos Mensais — dentro de 7 dias da primeira cobrança
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Em conformidade com o artigo 49 do Código de Defesa do Consumidor (CDC), você tem
                    direito ao arrependimento e ao reembolso integral dentro de <strong className="text-foreground">7 dias corridos</strong>{" "}
                    a partir da data da primeira cobrança. Para solicitar, entre em contato pelo
                    e-mail{" "}
                    <a
                      href="mailto:contato@vorolabs.app"
                      className="text-primary underline underline-offset-4"
                    >
                      contato@vorolabs.app
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Planos Mensais — após 7 dias da primeira cobrança
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Após o prazo de arrependimento de 7 dias, não são concedidos reembolsos para
                    planos mensais. O acesso à plataforma permanece ativo até o final do período de
                    cobrança vigente, mesmo após o cancelamento.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Planos Anuais
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Para planos anuais, é possível solicitar reembolso proporcional (pro-rata) dentro
                    de <strong className="text-foreground">30 dias corridos</strong> a partir da data
                    do primeiro pagamento. O valor reembolsado corresponderá ao período não utilizado,
                    calculado de forma proporcional ao número de meses restantes do ciclo anual.
                    Após os 30 dias iniciais, não são concedidos reembolsos para planos anuais.
                  </p>
                </div>

              </div>
            </motion.section>

            <hr className="border-border" />

            {/* 3 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                3. Como Solicitar Reembolso
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para solicitar um reembolso, siga os passos abaixo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Envie um e-mail para{" "}
                  <a
                    href="mailto:contato@vorolabs.app"
                    className="text-primary underline underline-offset-4"
                  >
                    contato@vorolabs.app
                  </a>{" "}
                  com o assunto "Solicitação de Reembolso".
                </li>
                <li>
                  Inclua o nome cadastrado na conta, o e-mail de acesso e o motivo do cancelamento.
                </li>
                <li>
                  Nossa equipe responderá dentro de <strong className="text-foreground">5 dias úteis</strong> com
                  a confirmação e as instruções para processamento.
                </li>
                <li>
                  Após a aprovação, o reembolso é processado pelo Mercado Pago e pode levar de 5 a
                  15 dias úteis para aparecer na sua fatura, dependendo da instituição financeira.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 4 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                4. Cancelamento de Assinatura
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Você pode cancelar sua assinatura a qualquer momento:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Acesse <strong className="text-foreground">Configurações &rarr; Assinatura</strong> dentro
                  da plataforma e clique em "Cancelar assinatura".
                </li>
                <li>
                  O cancelamento será efetivado ao término do período de cobrança atual; você não
                  será cobrado novamente.
                </li>
                <li>
                  Seu acesso permanecerá ativo até o último dia do período já pago.
                </li>
                <li>
                  Após o encerramento da assinatura, seus dados (clientes, agendamentos, financeiro)
                  ficam disponíveis para exportação por <strong className="text-foreground">90 dias</strong>.
                  Após esse prazo, os dados são excluídos permanentemente dos nossos servidores.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 5 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Exceções</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Não são elegíveis a reembolso as seguintes situações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Contas encerradas por violação dos Termos de Serviço, uso fraudulento ou
                  comportamento abusivo — a rescisão é imediata e sem direito a reembolso.
                </li>
                <li>
                  Solicitações fora dos prazos estabelecidos nesta política.
                </li>
                <li>
                  Interrupções de serviço causadas por eventos de força maior, falhas de terceiros ou
                  ações do próprio usuário.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Em caso de encerramento por violação dos Termos, a VoroLabs poderá, a seu critério,
                fornecer uma cópia dos dados do estabelecimento mediante solicitação formal por e-mail.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 6 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Chargebacks</h2>
              <p className="text-muted-foreground leading-relaxed">
                Antes de abrir uma disputa (chargeback) junto à sua operadora de cartão ou banco,
                pedimos que entre em contato conosco pelo e-mail{" "}
                <a
                  href="mailto:contato@vorolabs.app"
                  className="text-primary underline underline-offset-4"
                >
                  contato@vorolabs.app
                </a>{" "}
                para que possamos resolver a situação de forma direta e ágil. Chargebacks indevidos
                ou fraudulentos resultarão no bloqueio imediato da conta e poderão ser contestados
                junto às operadoras com a apresentação das evidências de uso do serviço. Casos de
                disputa legítima serão tratados com prioridade pela nossa equipe de suporte.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 7 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas sobre reembolsos, cancelamentos ou cobranças, entre em contato com nossa
                equipe:
              </p>
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-border">
                <p className="text-sm text-foreground font-medium">VoroLabs — Suporte Financeiro</p>
                <p className="text-sm text-muted-foreground">
                  E-mail:{" "}
                  <a
                    href="mailto:contato@vorolabs.app"
                    className="text-primary underline underline-offset-4"
                  >
                    contato@vorolabs.app
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Prazo de resposta: até 5 dias úteis.
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
