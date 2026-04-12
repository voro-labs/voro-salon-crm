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

export default function CookiesPage() {
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
              Política de Cookies
            </motion.h1>
            <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed max-w-2xl">
              Esta política explica como a VoroLabs utiliza cookies e tecnologias similares na
              plataforma Voro Salon, quais dados são coletados por meio deles e como você pode
              gerenciá-los.
            </motion.p>
          </motion.div>

          {/* Sections */}
          <motion.div variants={stagger} {...vp} className="space-y-0">

            {/* 1 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">1. O que são Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies são pequenos arquivos de texto armazenados no seu navegador ou dispositivo
                quando você acessa um site ou aplicação web. Eles permitem que a plataforma reconheça
                seu dispositivo em visitas subsequentes, mantenha sua sessão autenticada, lembre suas
                preferências e colete informações de uso de forma agregada. Cookies não são vírus nem
                programas maliciosos — eles não executam código e não acessam outros arquivos do seu
                dispositivo.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 2 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Cookies que Utilizamos
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Classificamos os cookies utilizados pela plataforma nas seguintes categorias:
              </p>

              <div className="space-y-6">

                {/* Essenciais */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Essenciais
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Necessários para o funcionamento básico da plataforma. Sem eles, serviços como
                    autenticação e navegação entre páginas não funcionam. Não podem ser desativados.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded text-foreground">
                        vorolabs_salon_token
                      </code>{" "}
                      — token JWT de autenticação, válido por até 7 dias.
                    </li>
                    <li>
                      Cookie de sessão — mantém o estado da sessão do usuário durante a navegação.
                    </li>
                  </ul>
                </div>

                {/* Funcionais */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Funcionais
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Permitem que a plataforma lembre escolhas que você faz e ofereça funcionalidades
                    personalizadas. Podem ser desativados, mas isso pode afetar sua experiência.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      Preferência de tema (claro/escuro/sistema) — salva sua escolha de aparência
                      visual entre sessões.
                    </li>
                    <li>
                      Preferência de idioma — armazena o idioma selecionado na interface.
                    </li>
                  </ul>
                </div>

                {/* Analíticos */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Analíticos
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Coletam informações de forma anônima e agregada sobre como os usuários interagem
                    com a plataforma, ajudando-nos a identificar melhorias. Nenhum dado pessoal
                    identificável é coletado por esses cookies.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      Estatísticas anônimas de uso: páginas mais acessadas, tempo de sessão, fluxo de
                      navegação.
                    </li>
                    <li>
                      Detecção de erros e performance: tempo de carregamento e erros de interface.
                    </li>
                  </ul>
                </div>

                {/* Marketing */}
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    Marketing
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    A VoroLabs <strong className="text-foreground">não utiliza</strong> cookies de
                    rastreamento para fins publicitários ou de marketing na plataforma Voro Salon.
                  </p>
                </div>

              </div>
            </motion.section>

            <hr className="border-border" />

            {/* 3 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                3. Como Gerenciar Cookies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Você pode controlar e/ou excluir cookies diretamente nas configurações do seu
                navegador. Veja como fazer isso nos principais navegadores:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Google Chrome:</strong> Configurações &rarr;
                  Privacidade e segurança &rarr; Cookies e outros dados de sites.
                </li>
                <li>
                  <strong className="text-foreground">Mozilla Firefox:</strong> Configurações &rarr;
                  Privacidade e Segurança &rarr; Cookies e dados do site.
                </li>
                <li>
                  <strong className="text-foreground">Safari:</strong> Preferências &rarr;
                  Privacidade &rarr; Gerenciar Dados do Site.
                </li>
                <li>
                  <strong className="text-foreground">Microsoft Edge:</strong> Configurações &rarr;
                  Cookies e permissões do site.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Atenção: desativar cookies essenciais pode impedir o funcionamento correto da
                plataforma, incluindo o acesso à sua conta.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 4 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Cookies de Terceiros</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Alguns serviços de terceiros integrados à plataforma podem definir seus próprios
                cookies, sujeitos às respectivas políticas de privacidade:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Vercel Analytics:</strong> coleta métricas
                  anônimas de performance e uso da plataforma sem identificar usuários individuais.
                  Consulte a{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    política de privacidade da Vercel
                  </a>
                  .
                </li>
                <li>
                  <strong className="text-foreground">Mercado Pago:</strong> utilizado no fluxo de
                  pagamento de assinaturas. Cookies definidos durante o checkout seguem a{" "}
                  <a
                    href="https://www.mercadopago.com.br/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    política de privacidade do Mercado Pago
                  </a>
                  .
                </li>
              </ul>
            </motion.section>

            <hr className="border-border" />

            {/* 5 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                5. Atualizações desta Política
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Esta política pode ser atualizada periodicamente para refletir mudanças em nossa
                prática de uso de cookies ou exigências legais. Quando houver alterações relevantes,
                notificaremos os usuários ativos por e-mail ou mediante aviso na plataforma.
                Recomendamos que você revise esta página periodicamente. A data da última atualização
                sempre estará indicada no topo desta página.
              </p>
            </motion.section>

            <hr className="border-border" />

            {/* 6 */}
            <motion.section variants={fadeUp} className="py-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas sobre o uso de cookies pela VoroLabs, entre em contato:
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
