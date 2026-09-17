import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade · Radar AI",
  description:
    "Política de Privacidade e LGPD do Radar AI, produto da BMG Tech AI.",
};

export default function PrivacidadePage() {
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
            Política de Privacidade e LGPD — Radar AI / BMG Tech AI
          </h1>
          <p className="mt-2 text-sm text-slate-400">Última atualização: Setembro de 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300">
            <p>
              A <strong className="text-white">BMG Tech AI</strong> está comprometida com a
              privacidade, segurança e proteção dos dados pessoais de seus clientes e
              usuários, em estrita conformidade com a Lei Geral de Proteção de Dados
              Pessoais (Lei nº 13.709/2018 — LGPD).
            </p>

            <section>
              <h2 className="text-lg font-semibold text-white">
                1. Papel da BMG Tech AI na LGPD
              </h2>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">Controladora dos dados do Cliente:</strong>{" "}
                  somos controladoras dos dados cadastrais do contratante (Nome, E-mail,
                  WhatsApp, Razão Social, CNPJ e Dados Financeiros).
                </li>
                <li>
                  <strong className="text-white">Operadora dos dados de avaliações:</strong> no
                  processamento de comentários públicos coletados da internet para geração
                  de insights por IA, atuamos estritamente no tratamento de dados abertos e
                  públicos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                2. Dados coletados e finalidades
              </h2>
              <p className="mt-2">
                Coletamos e tratamos apenas os dados estritamente necessários para a
                prestação do serviço:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">Dados cadastrais (Nome, E-mail, WhatsApp):</strong>{" "}
                  para identificação, autenticação via Supabase Auth e envio de alertas de
                  reputação em tempo real via WhatsApp/E-mail.
                </li>
                <li>
                  <strong className="text-white">Dados financeiros e de cartão de crédito:</strong>{" "}
                  os dados do cartão são processados e tokenizados diretamente pelo gateway
                  de pagamento <strong className="text-white">Mercado Pago</strong>{" "}
                  (Certificação PCI-DSS). A BMG Tech AI{" "}
                  <strong className="text-white">NÃO</strong> armazena números completos de
                  cartão ou CVV em seus servidores.
                </li>
                <li>
                  <strong className="text-white">Dados de monitoramento:</strong> URLs públicas
                  de perfis da empresa do Usuário em canais de reclamação e lojas de
                  aplicativos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                3. Base legal para o tratamento de dados
              </h2>
              <p className="mt-2">
                O tratamento de dados pessoais no Radar AI fundamenta-se nas seguintes bases
                legais da LGPD (Art. 7º):
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">Execução de Contrato (Art. 7º, V):</strong>{" "}
                  necessário para prestação dos serviços do Radar AI e gestão das
                  assinaturas.
                </li>
                <li>
                  <strong className="text-white">Legítimo Interesse (Art. 7º, IX):</strong> para
                  envio de diagnósticos de IA e melhorias contínuas na segurança e
                  funcionalidade da plataforma.
                </li>
                <li>
                  <strong className="text-white">
                    Cumprimento de Obrigação Legal (Art. 7º, II):
                  </strong>{" "}
                  guarda de registros de acesso e emissão de comprovantes fiscais.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                4. Compartilhamento de dados com terceiros
              </h2>
              <p className="mt-2">
                Não vendemos nem comercializamos dados pessoais. O compartilhamento ocorre
                exclusivamente com parceiros tecnológicos essenciais:
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-white">Supabase:</strong> banco de dados e
                  infraestrutura de autenticação segura.
                </li>
                <li>
                  <strong className="text-white">Mercado Pago:</strong> processamento de
                  pagamentos e tokenização do cartão de crédito.
                </li>
                <li>
                  <strong className="text-white">Provedores de LLM (OpenAI / Google Gemini):</strong>{" "}
                  apenas os textos anônimos das avaliações públicas são enviados para análise
                  de sentimentos e diagnósticos de erros (nenhum dado pessoal do contratante
                  é compartilhado com os modelos).
                </li>
                <li>
                  <strong className="text-white">Netlify:</strong> hospedagem da aplicação web.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                5. Direitos do titular dos dados (Art. 18 da LGPD)
              </h2>
              <p className="mt-2">
                O Usuário pode solicitar a qualquer momento através do e-mail{" "}
                <a
                  href="mailto:suporte@bmgtechai.com.br"
                  className="font-medium text-[#67E8F9] hover:underline"
                >
                  suporte@bmgtechai.com.br
                </a>
                :
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                <li>Revogação do consentimento e exclusão definitiva da conta.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">
                6. Segurança e retenção de dados
              </h2>
              <p className="mt-2">
                Utilizamos criptografia SSL/TLS em todas as comunicações, controle de acesso
                baseado em funções (RLS no Supabase) e armazenamento seguro. Após o
                encerramento da conta, os dados cadastrais serão mantidos apenas pelo período
                exigido por obrigações legais ou regulatórias.
              </p>
            </section>

            <p className="border-t border-white/10 pt-6 text-slate-400">
              Veja também os{" "}
              <Link href="/termos" className="text-[#67E8F9] hover:underline">
                Termos de Uso e Prestação de Serviços
              </Link>
              .
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
