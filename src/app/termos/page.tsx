import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso · Radar AI",
  description:
    "Termos de Uso e Prestação de Serviços do Radar AI, produto da BMG Tech AI.",
};

export default function TermosPage() {
  return (
    <div className="min-h-full bg-[#0B0F19] text-slate-200">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Radar AI
        </Link>
        <Link href="/signup" className="text-sm text-[#67E8F9] hover:underline">
          Criar conta
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        <article className="rounded-2xl border border-white/10 bg-[#111A2E] p-6 sm:p-8">
          <p className="text-xs font-medium tracking-wide text-[#67E8F9] uppercase">
            BMG Tech AI
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-white text-balance">
            Termos de Uso e Prestação de Serviços — Radar AI
          </h1>
          <p className="mt-2 text-sm text-slate-400">Última atualização: Setembro de 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <p>
              Bem-vindo ao <strong className="text-white">Radar AI</strong>, um produto
              pertencente e operado pela <strong className="text-white">BMG Tech AI</strong>{" "}
              (&quot;Nós&quot;, &quot;Nosso&quot; ou &quot;Plataforma&quot;). Ao cadastrar-se e
              utilizar nossa plataforma, você (&quot;Usuário&quot;, &quot;Cliente&quot; ou
              &quot;Contratante&quot;) concorda integralmente com os termos e condições
              descritos abaixo.
            </p>

            <section>
              <h2 className="text-lg font-semibold text-white">1. Objeto do serviço</h2>
              <p className="mt-2">
                O Radar AI é um software como serviço (SaaS) B2B voltado para o
                monitoramento, consolidação, análise de sentimento e diagnóstico por
                Inteligência Artificial de reputação e avaliações públicas (Reclame AQUI,
                Consumidor.gov, Google, App Store, Play Store e iFood).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                2. Período de teste gratuito (7 dias trial) e cobrança automática
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">2.1.</strong> O Radar AI oferece aos novos
                  clientes um período de teste gratuito de 7 (sete) dias corridos.
                </li>
                <li>
                  <strong className="text-white">2.2. Obrigatoriedade do cartão de crédito:</strong>{" "}
                  para ativação do teste gratuito, o Usuário deverá fornecer
                  obrigatoriamente os dados válidos de um cartão de crédito. Nenhuma
                  cobrança do plano escolhido será efetuada durante os 7 (sete)
                  primeiros dias.
                </li>
                <li>
                  <strong className="text-white">2.3. Cobrança automática no 8º dia:</strong>{" "}
                  transcorrido o prazo de 7 (sete) dias sem que o Usuário solicite o
                  cancelamento da assinatura, o valor do plano selecionado (Start ou Pro)
                  será cobrado automaticamente no cartão de crédito cadastrado.
                </li>
                <li>
                  <strong className="text-white">2.4. Verificação do cartão:</strong> a
                  Plataforma reserva-se o direito de realizar uma cobrança simbólica
                  temporária (pré-autorização de R$ 1,00 a R$ 2,00) para validação do
                  cartão, a qual será imediatamente estornada.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                3. Cancelamento e direito de arrependimento
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">3.1. Cancelamento durante o trial:</strong> o
                  Usuário pode cancelar a assinatura a qualquer momento durante os 7
                  (sete) dias de teste gratuito diretamente no painel da plataforma (
                  <code className="rounded bg-white/5 px-1.5 py-0.5 text-[#67E8F9]">
                    /dashboard/financial
                  </code>
                  ). Caso o cancelamento ocorra antes do 8º dia,{" "}
                  <strong className="text-white">
                    nenhuma taxa ou mensalidade será cobrada
                  </strong>
                  .
                </li>
                <li>
                  <strong className="text-white">3.2. Cancelamento pós-trial:</strong> após o
                  término do período de teste e efetivação da primeira cobrança, o
                  cancelamento impedirá futuras renovações no ciclo seguinte. Não haverá
                  reembolso proporcional (prorrata inverso) para o ciclo mensal/trimestral
                  corrente já pago e em utilização.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                4. Regras de uso e restrições
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">4.1. Trava de canais registrados:</strong> por
                  motivos de estabilidade e prevenção de uso indevido de rastreadores, as
                  URLs e identificadores de canais monitorados cadastrados no onboarding
                  inicial do Cliente tornam-se de leitura exclusiva (Read-Only). Alterações
                  subsequentes dependem do suporte técnico da BMG Tech AI.
                </li>
                <li>
                  <strong className="text-white">4.2.</strong> O Usuário é o único responsável
                  pela veracidade dos dados informados e pela guarda de suas credenciais de
                  acesso.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                5. Limitação de responsabilidade
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">5.1.</strong> O Radar AI utiliza APIs
                  públicas, web scraping e modelos de Inteligência Artificial para gerar
                  insights. Não nos responsabilizamos por indisponibilidades temporárias
                  das plataformas de terceiros (Reclame AQUI, Google, etc.).
                </li>
                <li>
                  <strong className="text-white">5.2.</strong> Os diagnósticos gerados pela IA
                  constituem recomendações analíticas e não garantem resultados financeiros
                  ou operacionais específicos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                6. Foro e legislação aplicável
              </h2>
              <p className="mt-2">
                Estes termos são regidos pelas leis da República Federativa do Brasil. Fica
                eleito o Foro da Comarca da sede da BMG Tech AI para dirimir quaisquer
                controvérsias.
              </p>
            </section>

            <p className="border-t border-white/10 pt-6 text-slate-400">
              Veja também a{" "}
              <Link href="/privacidade" className="text-[#67E8F9] hover:underline">
                Política de Privacidade e LGPD
              </Link>
              .
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
