"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  BrainCircuit,
  CheckCircle2,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Sparkles,
  Star,
  ThumbsDown,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_TRIGGER =
  "h-auto min-h-8 flex-1 rounded-full border-0 px-3 py-2 text-xs text-slate-300 shadow-none sm:flex-none sm:px-4 sm:text-sm data-active:bg-gradient-to-r data-active:from-[#22D3EE] data-active:to-[#2547A8] data-active:font-semibold data-active:text-[#0B0F19] data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-[#0B0F19]";

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      <div className="flex gap-1.5">
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
      </div>
      <p className="truncate text-xs font-medium text-slate-400">{title}</p>
    </div>
  );
}

function MockShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F19]/80 shadow-[0_24px_80px_-20px_rgba(15,23,41,0.9)] backdrop-blur-xl">
      <WindowChrome title={title} />
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function ChannelsMock() {
  const channels = [
    {
      label: "Reclame AQUI",
      value: "reclameaqui.com.br/empresa/sua-empresa",
    },
    {
      label: "Consumidor.gov",
      value: "consumidor.gov.br/empresa/sua-empresa",
    },
    {
      label: "Google Meu Negócio",
      value: "google.com/maps/place/sua-empresa",
    },
    {
      label: "Play Store",
      value: "play.google.com/store/apps/details?id=br.com.suaempresa",
    },
  ];

  return (
    <MockShell title="Radar AI · Configurações">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Canais e alertas</p>
          <p className="text-xs text-slate-400">4 plataformas ativas nesta conta</p>
        </div>
        <Badge className="border-transparent bg-emerald-400/15 text-emerald-300">
          Coleta ativa
        </Badge>
      </div>
      <div className="grid gap-3">
        {channels.map((channel) => (
          <label key={channel.label} className="grid gap-1.5">
            <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
              {channel.label}
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-8 min-w-0 flex-1 items-center truncate rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-slate-200">
                {channel.value}
              </div>
              <Badge className="w-fit shrink-0 border-transparent bg-emerald-400/15 text-emerald-300">
                <CheckCircle2 />
                Conectado e Monitorando
              </Badge>
            </div>
          </label>
        ))}
      </div>
    </MockShell>
  );
}

function DashboardMock() {
  const kpis = [
    { label: "Média", value: "4.2★", icon: Star },
    { label: "Feedbacks no mês", value: "128", icon: MessageSquare },
    { label: "Negativos", value: "8%", icon: ThumbsDown },
    { label: "Alertas WhatsApp", value: "12", icon: Bell },
  ];

  const rows = [
    {
      author: "Carla M.",
      text: "Não consigo entrar no app depois da atualização.",
      tag: "Play Store",
      tagClass: "bg-emerald-400/15 text-emerald-300",
    },
    {
      author: "Rafael P.",
      text: "Atendimento demorou 4 dias para responder.",
      tag: "Reclame AQUI",
      tagClass: "bg-sky-400/15 text-sky-300",
    },
    {
      author: "Juliana S.",
      text: "Pix ficou pendente e o pedido não confirmou.",
      tag: "Consumidor.gov",
      tagClass: "bg-amber-400/15 text-amber-300",
    },
  ];

  return (
    <MockShell title="Radar AI · Dashboard">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400">{kpi.label}</p>
                <Icon className="size-3.5 text-[#67E8F9]" />
              </div>
              <p className="mt-2 text-lg font-semibold text-white">{kpi.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <div className="hidden grid-cols-[1fr_2fr_auto] gap-3 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] tracking-wide text-slate-400 uppercase sm:grid">
          <span>Autor</span>
          <span>Comentário</span>
          <span>Canal</span>
        </div>
        <ul className="divide-y divide-white/10">
          {rows.map((row) => (
            <li
              key={row.author}
              className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_2fr_auto] sm:items-center"
            >
              <p className="text-sm font-medium text-white">{row.author}</p>
              <p className="truncate text-sm text-slate-400">{row.text}</p>
              <Badge className={`w-fit border-transparent ${row.tagClass}`}>
                {row.tag}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </MockShell>
  );
}

function InsightsMock() {
  return (
    <MockShell title="Radar AI · Insights de IA">
      <div className="grid gap-3">
        <InsightAlert
          icon={BrainCircuit}
          label="Diagnóstico técnico"
          text='⚠️ Detectado aumento de 42% em reclamações sobre "Erro de Autenticação / Bug de Login" nas últimas 24h. Ação recomendada: Verificar servidores de auth.'
        />
        <InsightAlert
          icon={Truck}
          label="Diagnóstico operacional"
          text='⚠️ Detectado aumento de 31% em reclamações sobre "Atraso na entrega do produto" nesta semana. Ação recomendada: revisar o SLA da transportadora e o fluxo de expedição.'
        />
      </div>
    </MockShell>
  );
}

function InsightAlert({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof BrainCircuit;
  label: string;
  text: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/35 bg-gradient-to-br from-[#1a1408] via-[#111A2E] to-[#083344] p-4 sm:p-5">
      <div className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="relative flex gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/30">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#67E8F9] uppercase">
            <Sparkles className="size-3.5" />
            {label}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-100">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductShowcase() {
  const [tab, setTab] = useState("canais");

  return (
    <section id="produto" className="relative overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 700px 420px at 50% 0%, rgba(34, 211, 238, 0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-[#67E8F9]">Product tour</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-white text-balance">
            Veja o Radar AI em ação
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Da configuração dos canais ao diagnóstico de causa raiz — o mesmo fluxo
            que sua equipe usa no dia a dia.
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(String(value))}
          className="mt-10 gap-6"
        >
          <TabsList className="mx-auto flex h-auto w-fit max-w-full flex-wrap justify-center gap-1 overflow-hidden rounded-full border border-white/10 bg-[#111A2E]/80 p-1 text-slate-300 shadow-[0_10px_40px_-20px_rgba(34,211,238,0.4)] backdrop-blur-md group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="canais" className={TAB_TRIGGER}>
              <Radio />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="dashboard" className={TAB_TRIGGER}>
              <LayoutDashboard />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="insights" className={TAB_TRIGGER}>
              <Sparkles />
              Insights de IA
            </TabsTrigger>
          </TabsList>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            {tab === "canais" ? (
              <>
                <ShowcaseCopy
                  title="Cadastre seus canais em segundos"
                  description="Basta inserir os links do seu Reclame AQUI, Consumidor.gov, Google e Lojas de Apps para iniciar o monitoramento."
                />
                <ChannelsMock />
              </>
            ) : null}
            {tab === "dashboard" ? (
              <>
                <ShowcaseCopy
                  title="Todas as suas avaliações em um só lugar"
                  description="Acompanhe notas, tendências de insatisfação e responda avaliações rapidamente com auxílio de IA."
                />
                <DashboardMock />
              </>
            ) : null}
            {tab === "insights" ? (
              <>
                <ShowcaseCopy
                  title="IA que identifica bugs e causas raízes"
                  description="Nossa inteligência analisa o padrão das reclamações e avisa sua equipe sobre falhas técnicas ou operacionais no exato momento em que surgem."
                />
                <InsightsMock />
              </>
            ) : null}
          </div>
        </Tabs>
      </div>
    </section>
  );
}

function ShowcaseCopy({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-xl">
      <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-white text-balance">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">{description}</p>
    </div>
  );
}
