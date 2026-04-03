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

export default function TermsPage() {
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
              Termos de Serviço
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed max-w-2xl">
              Ao criar uma conta ou utilizar a plataforma Voro Salon, você concorda com os presentes
              Termos de Serviço. Leia-os atentamente antes de prosseguir.
            </motion.p>
          </motion.div>

          {/* Sections */}
          <motion.div variants={stagger} {...vp} className="space-y-0">

            {/* 1 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                1. Aceitação dos Termos
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes Termos de Serviço ("Termos") constituem um acordo legal entre você ("Usuário"
                ou "Cliente") e a VoroLabs ("nós", "nosso"), pessoa jurídica responsável pela
                plataforma Voro Salon. Ao acessar ou utilizar qualquer parte da plataforma, você
                declara ter lido, compreendido e concordado com todos os termos aqui dispostos, bem
                como com nossa Política de Privacidade. Se não concordar com estes Termos, não utilize
                a plataforma.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 2 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Descrição do Serviço
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                O Voro Salon é um software de gestão baseado em nuvem (SaaS) voltado para
                estabelecimentos de beleza, incluindo salões de cabeleireiro, barbearias e estúdios de
                unhas. A plataforma oferece funcionalidades como agendamento online, gestão de
                clientes, controle financeiro, relatórios gerenciais e comunicação via WhatsApp.
                Reservamo-nos o direito de alterar, suspender ou descontinuar qualquer funcionalidade
                a qualquer momento, com aviso prévio razoável aos usuários ativos.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 3 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                3. Cadastro e Conta
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para utilizar a plataforma, você deve criar uma conta. Ao fazê-lo, você declara e
                garante que:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Possui pelo menos 18 anos de idade.</li>
                <li>
                  Age em nome de uma pessoa jurídica devidamente constituída ou como profissional
                  autônomo legalmente habilitado.
                </li>
                <li>
                  As informações fornecidas no cadastro são verdadeiras, precisas e completas.
                </li>
                <li>
                  Manterá as informações da conta atualizadas ao longo do tempo.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Você é inteiramente responsável pela segurança das suas credenciais de acesso e por
                todas as atividades realizadas sob sua conta. Em caso de uso não autorizado, notifique
                imediatamente a VoroLabs pelo e-mail{" "}
                <a
                  href="mailto:contato@vorolabs.com.br"
                  className="text-primary underline underline-offset-4"
                >
                  contato@vorolabs.com.br
                </a>
                .
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 4 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                4. Planos e Pagamentos
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O acesso à plataforma está sujeito à contratação de um plano de assinatura:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Os planos disponíveis, com seus respectivos preços e funcionalidades, estão descritos
                  na{" "}
                  <a href="/prices" className="text-primary underline underline-offset-4">
                    página de planos
                  </a>
                  .
                </li>
                <li>
                  A cobrança é realizada mensalmente ou anualmente, conforme o plano escolhido, via
                  Mercado Pago.
                </li>
                <li>
                  Em caso de falha no pagamento, o acesso poderá ser suspenso após um período de
                  carência de 3 dias úteis.
                </li>
                <li>
                  Os preços podem ser reajustados com aviso prévio de 30 dias por e-mail. O uso
                  continuado da plataforma após a vigência do reajuste implica aceitação do novo valor.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 5 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Cancelamento</h2>
              <p className="text-muted-foreground leading-relaxed">
                Você pode cancelar sua assinatura a qualquer momento diretamente nas configurações da
                conta. O cancelamento entrará em vigor ao final do período de cobrança vigente, e você
                manterá acesso completo à plataforma até essa data. Após o encerramento, seus dados
                ficarão disponíveis para exportação por até 90 dias, após o qual serão excluídos
                permanentemente. Para detalhes sobre reembolsos, consulte nossa{" "}
                <a href="/refund" className="text-primary underline underline-offset-4">
                  Política de Reembolso
                </a>
                .
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 6 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Uso Permitido</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ao utilizar a plataforma, você concorda em:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Utilizar o serviço exclusivamente para fins legítimos de gestão do seu
                  estabelecimento.
                </li>
                <li>
                  Não tentar fazer engenharia reversa, descompilar ou extrair o código-fonte da
                  plataforma.
                </li>
                <li>
                  Não utilizar a plataforma para enviar comunicações não solicitadas (spam) aos seus
                  clientes.
                </li>
                <li>
                  Não compartilhar suas credenciais de acesso com terceiros não autorizados.
                </li>
                <li>
                  Não realizar ações que sobrecarreguem ou comprometam a infraestrutura da plataforma.
                </li>
                <li>
                  Não usar a plataforma para qualquer atividade ilegal, fraudulenta ou que viole
                  direitos de terceiros.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                A violação dessas regras pode resultar na suspensão ou encerramento imediato da sua
                conta, sem direito a reembolso.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 7 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                7. Dados dos Clientes
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Os dados dos clientes do seu estabelecimento (nome, telefone, histórico de
                agendamentos etc.) inseridos na plataforma são de sua propriedade. A VoroLabs atua
                como operadora de dados em relação a essas informações, processando-as exclusivamente
                conforme suas instruções e para fins de prestação do serviço contratado. Você, como
                controlador de dados, é responsável por obter os consentimentos necessários de seus
                clientes para o tratamento de dados em conformidade com a LGPD.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 8 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                8. Disponibilidade
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A VoroLabs se compromete a manter a plataforma disponível com um nível de serviço
                (SLA) de 99,5% de uptime mensal, excluindo janelas de manutenção programada. Nos
                casos de manutenções planejadas que impliquem indisponibilidade, comunicaremos os
                usuários ativos com pelo menos 24 horas de antecedência por e-mail ou notificação na
                plataforma. Interrupções causadas por falhas de terceiros (provedores de nuvem,
                telecomunicações) ou por eventos de força maior não são computadas no cálculo do SLA.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 9 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                9. Limitação de Responsabilidade
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Na máxima extensão permitida pela legislação aplicável:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  A VoroLabs não se responsabiliza por danos indiretos, incidentais, especiais,
                  consequenciais ou punitivos, incluindo perda de receita, perda de dados ou
                  interrupção de negócios.
                </li>
                <li>
                  A responsabilidade total da VoroLabs perante você, por qualquer causa, está limitada
                  ao valor total pago por você à VoroLabs nos últimos 3 (três) meses anteriores ao
                  evento que originou a reclamação.
                </li>
                <li>
                  A plataforma é fornecida "como está" e "conforme disponível", sem garantias de
                  qualquer tipo, expressas ou implícitas.
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 10 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                10. Propriedade Intelectual
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos os direitos de propriedade intelectual relacionados à plataforma Voro Salon,
                incluindo software, design, logotipos, marcas registradas, textos e documentação, são
                de titularidade exclusiva da VoroLabs. O uso da plataforma não transfere ao usuário
                qualquer direito de propriedade sobre esses ativos. É vedada a reprodução, distribuição
                ou criação de obras derivadas sem autorização expressa e por escrito da VoroLabs.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 11 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                11. Lei Aplicável e Foro
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Quaisquer
                disputas decorrentes ou relacionadas a estes Termos serão submetidas à jurisdição
                exclusiva do Foro da Comarca de São Paulo — SP, renunciando as partes a qualquer
                outro foro, por mais privilegiado que seja.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 12 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">12. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas, sugestões ou notificações relacionadas a estes Termos de Serviço,
                entre em contato:
              </p>
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-border">
                <p className="text-sm text-foreground font-medium">VoroLabs</p>
                <p className="text-sm text-muted-foreground">
                  E-mail:{" "}
                  <a
                    href="mailto:contato@vorolabs.com.br"
                    className="text-primary underline underline-offset-4"
                  >
                    contato@vorolabs.com.br
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
