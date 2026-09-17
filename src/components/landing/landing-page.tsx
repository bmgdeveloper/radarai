"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import {
  CYCLE_LABELS,
  formatPlanPrice,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";

const PRO_DIAGNOSIS_FEATURE = "Análise Consolidada & Diagnóstico de Bugs por IA";

export function LandingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-full bg-[#0B0F19] text-slate-200">
      <div
        className="absolute inset-x-0 top-0 h-[520px] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 900px 500px at 12% -5%, rgba(37, 71, 168, 0.35), transparent 60%), radial-gradient(ellipse 700px 500px at 88% 10%, rgba(34, 211, 238, 0.1), transparent 60%)",
        }}
      />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#2547A8] font-[family-name:var(--font-heading)] text-sm font-bold text-[#0B0F19]">
            B
          </span>
          <span>
            <span className="block text-[10px] font-semibold tracking-[0.18em] text-[#67E8F9] uppercase">
              BMG Tech AI
            </span>
            <span className="font-[family-name:var(--font-heading)] text-lg font-semibold text-white">
              Radar AI
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#produto" className="hover:text-white">
            Produto
          </a>
          <a href="#como-funciona" className="hover:text-white">
            Como funciona
          </a>
          <a href="#diagnostico" className="hover:text-white">
            Insights de IA
          </a>
          <a href="#planos" className="hover:text-white">
            Planos
          </a>
          <button type="button" className="hover:text-white" onClick={() => setLoginOpen(true)}>
            Entrar
          </button>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-[#22D3EE] to-[#2547A8] px-4 py-2 font-semibold text-[#0B0F19] shadow-[0_10px_30px_-8px_rgba(34,211,238,0.45)]"
          >
            Criar Conta
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button type="button" className="text-sm" onClick={() => setLoginOpen(true)}>
            Entrar
          </button>
          <Link href="/signup" className="text-sm font-semibold text-[#67E8F9]">
            Criar Conta
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-[#67E8F9]">
              Proteção de reputação em tempo real
            </p>
            <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-white text-balance sm:text-5xl">
              Saiba o que dizem da sua empresa no Reclame AQUI e nas lojas de apps no
              segundo em que acontece.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              O Radar AI coleta avaliações, classifica o sentimento, diagnostica a
              causa raiz dos surtos e dispara o alerta automático no WhatsApp antes
              que a crise vire ticket, review viral ou perda de venda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-[#22D3EE] to-[#2547A8] px-5 py-2.5 text-sm font-semibold text-[#0B0F19]"
              >
                Proteger minha reputação
              </Link>
              <a
                href="#planos"
                className="rounded-full border border-cyan-300/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Ver planos
              </a>
            </div>
          </div>
          <WhatsAppMock />
        </section>

        <ProductShowcase />

        <section id="como-funciona" className="border-y border-white/10 bg-[#0F1729]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Coleta automática",
                  body: "Reclame AQUI, Consumidor.gov, lojas de apps, Google, Mercado Livre, iFood, 99 e Amazon no mesmo radar.",
                },
                {
                  title: "IA na triagem",
                  body: "Sentimento, categoria, resumo e resposta sugerida para o atendimento.",
                },
                {
                  title: "Alerta no WhatsApp",
                  body: "Nota baixa cai no celular do responsável no mesmo instante.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#111A2E] p-6"
                >
                  <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
                </article>
              ))}
            </div>
            <DiagnosisFeatureCard />
          </div>
        </section>

        <section id="planos" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-white">
                Planos
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Cartão de crédito com 7 dias de teste grátis via Mercado Pago.
                Trimestral com desconto. Sem cobrança no cadastro do cartão.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-[#111A2E] p-1 text-sm">
              {(["monthly", "quarterly"] as BillingCycle[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCycle(item)}
                  className={`rounded-full px-4 py-2 ${
                    cycle === item
                      ? "bg-gradient-to-r from-[#22D3EE] to-[#2547A8] font-semibold text-[#0B0F19]"
                      : "text-slate-300"
                  }`}
                >
                  {item === "quarterly"
                    ? "Trimestral — Desconto Especial"
                    : "Mensal"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {(Object.values(PLANS) as Array<(typeof PLANS)[PlanTier]>).map((plan) => {
              const popular = "popular" in plan && plan.popular;
              return (
                <article
                  key={plan.id}
                  className={`rounded-2xl border p-6 ${
                    popular
                      ? "border-[#22D3EE]/50 bg-[#111A2E] shadow-[0_20px_60px_-15px_rgba(34,211,238,0.25)]"
                      : "border-white/10 bg-[#0F1729]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white">
                      {plan.name}
                    </h3>
                    {popular ? (
                      <span className="rounded-full bg-[#22D3EE]/15 px-3 py-1 text-xs font-semibold text-[#67E8F9]">
                        Mais popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-4xl font-semibold text-white">
                    {formatPlanPrice(plan.prices[cycle])}
                    <span className="text-base font-normal text-slate-400">
                      /{CYCLE_LABELS[cycle].toLowerCase()}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{plan.channels}</p>
                  <ul className="mt-6 grid gap-2 text-sm text-slate-300">
                    {plan.features.map((feature) => {
                      const highlighted = feature === PRO_DIAGNOSIS_FEATURE;
                      return (
                        <li
                          key={feature}
                          className={
                            highlighted
                              ? "flex items-start gap-2 rounded-xl border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-3 py-2.5 text-[#E0F7FA]"
                              : undefined
                          }
                        >
                          {highlighted ? (
                            <Sparkles className="mt-0.5 size-4 shrink-0 text-[#67E8F9]" />
                          ) : (
                            <span className="text-slate-500">· </span>
                          )}
                          <span className={highlighted ? "font-semibold" : undefined}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href={`/signup?plan=${plan.id}&cycle=${cycle}`}
                    className={`mt-8 inline-flex w-full justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${
                      popular
                        ? "bg-gradient-to-r from-[#22D3EE] to-[#2547A8] text-[#0B0F19]"
                        : "border border-white/15 text-white hover:bg-white/5"
                    }`}
                  >
                    Assinar {plan.name}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500">
        <p>Radar AI · produto da BMG Tech AI · radar.bmgtechai.com.br</p>
        <p className="mt-2">
          <Link href="/termos" className="hover:text-slate-300 hover:underline">
            Termos de Uso
          </Link>
          {" · "}
          <Link href="/privacidade" className="hover:text-slate-300 hover:underline">
            Privacidade e LGPD
          </Link>
        </p>
      </footer>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

function DiagnosisFeatureCard() {
  return (
    <article
      id="diagnostico"
      className="relative overflow-hidden rounded-2xl border border-[#22D3EE]/35 bg-gradient-to-r from-[#111A2E] via-[#0F2744] to-[#083344] p-6 shadow-[0_20px_60px_-20px_rgba(34,211,238,0.35)] sm:p-8"
    >
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#67E8F9] uppercase">
            <Sparkles className="size-3.5" />
            Exclusivo Plano Pro
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-heading)] text-2xl font-semibold text-white text-balance sm:text-3xl">
            Diagnóstico Automático de Bugs e Falhas
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Nossa IA cruza centenas de avaliações e identifica imediatamente surtos
            de problemas (ex: falhas de login, bugs de pagamento ou queda de sinal)
            antes que afetem suas vendas.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/25 bg-[#0B0F19]/80 p-4 shadow-inner">
          <p className="text-[11px] font-medium tracking-wide text-[#67E8F9] uppercase">
            Alerta de Insights de IA
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-100 sm:text-base">
            ⚠️ 42% das queixas recentes são sobre Bug no Login
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Causa raiz consolidada · severidade alta
          </p>
        </div>
      </div>
    </article>
  );
}

function WhatsAppMock() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-3 text-center text-xs font-medium tracking-wide text-[#67E8F9] uppercase">
        Alerta automático no WhatsApp
      </p>
      <div className="rounded-[2rem] border border-cyan-300/20 bg-[#111A2E] p-3 shadow-[0_20px_60px_-15px_rgba(34,211,238,0.25)]">
        <div className="rounded-[1.5rem] bg-[#0B141A] px-4 pb-6 pt-3">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/15" />
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#22D3EE] to-[#2547A8] text-xs font-bold text-[#0B0F19]">
              RA
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Radar AI</p>
              <p className="text-[11px] text-emerald-400">alerta em tempo real</p>
            </div>
          </div>
          <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[#005c4b] px-3 py-2 text-[13px] leading-5 text-white">
            <p className="font-semibold">Alerta de reputação</p>
            <p className="mt-1 text-white/90">
              Nova reclamação 1★ no Reclame AQUI. Atendimento classificado como
              NEGATIVO pela IA.
            </p>
            <p className="mt-2 text-right text-[10px] text-white/55">agora</p>
          </div>
        </div>
      </div>
    </div>
  );
}
