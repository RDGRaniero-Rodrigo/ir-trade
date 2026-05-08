"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  listarNotasB3,
  listarNotasForex,
  type NotaB3Banco,
} from "@/lib/supabase/notas";
import {
  calcularFechamentosMensaisForex,
  type RelatorioForex,
  type ResumoMensalForex,
} from "@/lib/calculo-forex";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
  BarChart3,
  FileText,
  Calendar,
} from "lucide-react";
import { GraficoCandlesMensal } from "@/components/dashboard/GraficoCandlesMensal";
import { GraficoCandlesForex } from "@/components/dashboard/GraficoCandlesForex";

// ─── Types ────────────────────────────────────────────────────────────────────

type MercadoSelecionado = "b3" | "forex";
type ViewMode = "mensal" | "anual";

type NotaSalva = {
  id: string;
  numeroNota: string;
  dataPregao: string;
  cliente: string;
  valorNegocios: number;
  irrf: number;
  custos: number;
  valorLiquido: number;
  sinalLiquido: "C" | "D" | null;
};

type ResumoMensal = {
  chave: string;
  ano: number;
  mes: number;
  label: string;
  quantidade: number;
  valorNegocios: number;
  custos: number;
  irrf: number;
  liquido: number;
  prejuizoAcumuladoFinal: number;
  impostoEstimado: number;
  impostoAPagar: number;
};

type ResumoAnual = {
  ano: number;
  quantidade: number;
  valorNegocios: number;
  custos: number;
  irrf: number;
  liquido: number;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY_CONFIG = "irtrade_configuracoes_corretora";
const ALIQUOTA_DAY_TRADE = 0.2;

const NOMES_MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const NOMES_MESES_CURTOS = [
  "Jan","Fev","Mar","Abr","Mai","Jun",
  "Jul","Ago","Set","Out","Nov","Dez",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarNumeroUsd(valor: number) {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function round2(v: number) {
  return Number(v.toFixed(2));
}

function parseDataPregao(data: string) {
  const [dia, mes, ano] = data.split("/").map(Number);
  return { dia, mes, ano };
}

function normalizarDataForex(dataRelatorio: string) {
  const match = dataRelatorio.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getLiquidoAssinado(nota: NotaSalva) {
  return nota.sinalLiquido === "D" ? -nota.valorLiquido : nota.valorLiquido;
}

function getConfigFromStorage(): { mercado?: string } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}");
  } catch {
    return {};
  }
}

function setConfigToStorage(mercado: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ mercado }));
}

function mapNotaB3(nota: NotaB3Banco): NotaSalva {
  const dataPregaoFormatada = nota.data_pregao
    ? (() => {
        const [ano, mes, dia] = nota.data_pregao.split("-");
        return `${dia}/${mes}/${ano}`;
      })()
    : "";
  return {
    id: nota.id,
    numeroNota: nota.numero_nota ?? "",
    dataPregao: dataPregaoFormatada,
    cliente: nota.cliente ?? "",
    valorNegocios: Number(nota.valor_negocios ?? 0),
    irrf: Number(nota.irrf ?? 0),
    custos: Number(nota.custos ?? 0),
    valorLiquido: Number(nota.valor_liquido ?? 0),
    sinalLiquido: nota.sinal_liquido,
  };
}

// ─── Sub-componente: Card ─────────────────────────────────────────────────────

function CardResumoValor({
  titulo,
  valor,
  destaque = "normal",
  icone,
}: {
  titulo: string;
  valor: string;
  destaque?: "normal" | "positivo" | "negativo" | "alerta";
  icone?: React.ReactNode;
}) {
  const cor =
    destaque === "positivo" ? "text-emerald-400"
    : destaque === "negativo" ? "text-red-400"
    : destaque === "alerta" ? "text-yellow-400"
    : "text-white";

  return (
    <div className="rounded-[10px] bg-[#0c1d45] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {icone && <span className="text-slate-400">{icone}</span>}
        <p className="text-[10px] text-slate-400">{titulo}</p>
      </div>
      <p className={`mt-0.5 text-sm font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [mercado, setMercado] = useState<MercadoSelecionado>("b3");
  const [viewMode, setViewMode] = useState<ViewMode>("mensal");
  const [carregando, setCarregando] = useState(true);
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [resumosForex, setResumosForex] = useState<ResumoMensalForex[]>([]);
  const [relatoriosForexRaw, setRelatoriosForexRaw] = useState<RelatorioForex[]>([]);
  const [chaveMes, setChaveMes] = useState<string | null>(null);

  // ─── Carregar dados do banco ───────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const [b3, forex] = await Promise.all([listarNotasB3(), listarNotasForex()]);
      setNotasB3(b3.map(mapNotaB3));

      if (forex.length > 0) {
        const relatorios: RelatorioForex[] = forex.map((n) => ({
          id: n.id,
          data: normalizarDataForex(n.data_relatorio ?? ""),
          saldoInicial: Number(n.saldo_inicial_usd ?? 0),
          resultadoDia: Number(n.resultado_dia_usd ?? 0),
          depositoRetirada: Number(n.deposito_retirada_usd ?? 0),
          saldoFinal: Number(n.saldo_final_usd ?? 0),
        }));
        setRelatoriosForexRaw(relatorios);
        const resultados = await calcularFechamentosMensaisForex(relatorios);
        setResumosForex(resultados);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const config = getConfigFromStorage();
    if (config.mercado === "forex") setMercado("forex");
    carregarDados();
  }, [carregarDados]);

  // ─── Resumos mensais B3 ────────────────────────────────────────────────────

  const resumosMensaisB3 = useMemo<ResumoMensal[]>(() => {
    const mapa = new Map<string, ResumoMensal>();

    for (const nota of notasB3) {
      const { mes, ano } = parseDataPregao(nota.dataPregao);
      const chave = `${ano}-${String(mes).padStart(2, "0")}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave, ano, mes,
          label: `${NOMES_MESES[mes - 1]} ${ano}`,
          quantidade: 0, valorNegocios: 0, custos: 0, irrf: 0, liquido: 0,
          prejuizoAcumuladoFinal: 0, impostoEstimado: 0, impostoAPagar: 0,
        });
      }

      const item = mapa.get(chave)!;
      item.quantidade += 1;
      item.valorNegocios += nota.valorNegocios;
      item.custos += nota.custos;
      item.irrf += nota.irrf;
      item.liquido += getLiquidoAssinado(nota);
    }

    const ordenado = Array.from(mapa.values())
      .map((item) => ({
        ...item,
        valorNegocios: round2(item.valorNegocios),
        custos: round2(item.custos),
        irrf: round2(item.irrf),
        liquido: round2(item.liquido),
      }))
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);

    let prejAcum = 0;
    for (const item of ordenado) {
      if (item.liquido < 0) {
        item.prejuizoAcumuladoFinal = round2(prejAcum + Math.abs(item.liquido));
      } else if (item.liquido > 0) {
        const base = round2(Math.max(0, item.liquido - prejAcum));
        item.impostoEstimado = round2(base * ALIQUOTA_DAY_TRADE);
        item.impostoAPagar = round2(Math.max(0, item.impostoEstimado - item.irrf));
        item.prejuizoAcumuladoFinal = round2(Math.max(0, prejAcum - item.liquido));
      }
      prejAcum = item.prejuizoAcumuladoFinal;
    }

    return ordenado.reverse();
  }, [notasB3]);

  // ─── Resumos anuais B3 ─────────────────────────────────────────────────────

  const resumosAnuaisB3 = useMemo<ResumoAnual[]>(() => {
    const mapa = new Map<number, ResumoAnual>();
    for (const nota of notasB3) {
      const { ano } = parseDataPregao(nota.dataPregao);
      if (!mapa.has(ano)) mapa.set(ano, { ano, quantidade: 0, valorNegocios: 0, custos: 0, irrf: 0, liquido: 0 });
      const item = mapa.get(ano)!;
      item.quantidade += 1;
      item.valorNegocios += nota.valorNegocios;
      item.custos += nota.custos;
      item.irrf += nota.irrf;
      item.liquido += getLiquidoAssinado(nota);
    }
    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        valorNegocios: round2(item.valorNegocios),
        custos: round2(item.custos),
        irrf: round2(item.irrf),
        liquido: round2(item.liquido),
      }))
      .sort((a, b) => b.ano - a.ano);
  }, [notasB3]);

  // ─── Seleção de mês ────────────────────────────────────────────────────────

  useEffect(() => {
    if (mercado === "b3" && resumosMensaisB3.length > 0 && !chaveMes) {
      setChaveMes(resumosMensaisB3[0].chave);
    }
    if (mercado === "forex" && resumosForex.length > 0 && !chaveMes) {
      setChaveMes(resumosForex[0].chave);
    }
  }, [mercado, resumosMensaisB3, resumosForex, chaveMes]);

  const mesSelecionadoB3 =
    resumosMensaisB3.find((m) => m.chave === chaveMes) || resumosMensaisB3[0] || null;

  const mesSelecionadoForex =
    resumosForex.find((m) => m.chave === chaveMes) || resumosForex[0] || null;

  function handleMudarMercado(m: MercadoSelecionado) {
    setMercado(m);
    setConfigToStorage(m);
    setChaveMes(null);
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="text-slate-300">Carregando dados...</span>
        </div>
      </div>
    );
  }

  // ─── Abas de visualização ──────────────────────────────────────────────────

  const abas = (
    <div className="flex gap-2">
      <button
        onClick={() => setViewMode("mensal")}
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
          viewMode === "mensal"
            ? "bg-emerald-500 text-white"
            : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        Resumo Mensal
      </button>
      <button
        onClick={() => setViewMode("anual")}
        className={`inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
          viewMode === "anual"
            ? "bg-emerald-500 text-white"
            : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
        }`}
      >
        <Calendar className="h-4 w-4" />
        Resumo Anual
      </button>
    </div>
  );

  // ─── Seletor de meses ──────────────────────────────────────────────────────

  const seletorMeses = viewMode === "mensal" && (
    <div className="flex flex-wrap gap-1.5">
      {mercado === "b3" && resumosMensaisB3.map((mes) => (
        <button
          key={mes.chave}
          onClick={() => setChaveMes(mes.chave)}
          className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
            chaveMes === mes.chave
              ? "bg-emerald-500 text-white"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
          }`}
        >
          {mes.label}
        </button>
      ))}
      {mercado === "forex" && resumosForex.map((mes) => (
        <button
          key={mes.chave}
          onClick={() => setChaveMes(mes.chave)}
          className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
            chaveMes === mes.chave
              ? "bg-emerald-500 text-white"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
          }`}
        >
          {mes.mes}
        </button>
      ))}
    </div>
  );

  // ─── Estado vazio ──────────────────────────────────────────────────────────

  const estadoVazio = (
    <div className="flex min-h-[200px] items-center justify-center rounded-[16px] border border-slate-800 bg-[#061538]">
      <div className="text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-500" />
        <p className="mt-3 text-sm text-slate-300">Nenhuma nota importada ainda.</p>
        <button
          onClick={() => router.push("/dashboard/notas")}
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-xs font-medium text-white transition hover:bg-emerald-600"
        >
          Importar Nota
        </button>
      </div>
    </div>
  );

  // ─── Conteúdo Mensal B3 ────────────────────────────────────────────────────

  const conteudoMensalB3 = !mesSelecionadoB3 ? estadoVazio : (
    <div className="flex flex-col gap-3">
      <div className="rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {mesSelecionadoB3.label}
              <span className="ml-2 normal-case text-slate-600">· {mesSelecionadoB3.quantidade} nota(s)</span>
            </p>
            <p className={`mt-0.5 text-2xl font-bold ${mesSelecionadoB3.liquido < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {mesSelecionadoB3.liquido < 0 && "-"}
              {formatarMoeda(Math.abs(mesSelecionadoB3.liquido))}
            </p>
          </div>
          {mesSelecionadoB3.liquido >= 0
            ? <TrendingUp className="h-6 w-6 text-emerald-400" />
            : <TrendingDown className="h-6 w-6 text-red-400" />}
        </div>
      </div>

      <GraficoCandlesMensal
        notas={notasB3}
        mesSelecionado={{ ano: mesSelecionadoB3.ano, mes: mesSelecionadoB3.mes }}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CardResumoValor titulo="Valor dos Negócios" valor={formatarMoeda(mesSelecionadoB3.valorNegocios)} icone={<BarChart3 className="h-3 w-3" />} />
        <CardResumoValor titulo="Custos" valor={formatarMoeda(mesSelecionadoB3.custos)} destaque="negativo" />
        <CardResumoValor titulo="IRRF (Dedo-duro)" valor={formatarMoeda(mesSelecionadoB3.irrf)} destaque="alerta" />
        <CardResumoValor titulo="Notas Importadas" valor={String(mesSelecionadoB3.quantidade)} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CardResumoValor titulo="Prejuízo Acumulado" valor={formatarMoeda(mesSelecionadoB3.prejuizoAcumuladoFinal)} destaque={mesSelecionadoB3.prejuizoAcumuladoFinal > 0 ? "negativo" : "normal"} />
        <CardResumoValor titulo="Imposto Estimado (20%)" valor={formatarMoeda(mesSelecionadoB3.impostoEstimado)} destaque="alerta" />
        <CardResumoValor titulo="DARF a Pagar" valor={formatarMoeda(mesSelecionadoB3.impostoAPagar)} destaque={mesSelecionadoB3.impostoAPagar > 0 ? "positivo" : "normal"} icone={<Receipt className="h-3 w-3" />} />
      </div>
    </div>
  );

  // ─── Conteúdo Mensal Forex ─────────────────────────────────────────────────

  const conteudoMensalForex = !mesSelecionadoForex ? estadoVazio : (
    <div className="flex flex-col gap-3">
      <div className="rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {mesSelecionadoForex.mes}
              <span className="ml-2 normal-case text-slate-600">· {mesSelecionadoForex.quantidadeRelatorios} relatório(s)</span>
            </p>
            <p className={`mt-0.5 text-2xl font-bold ${mesSelecionadoForex.resultadoConvertidoBRL < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {mesSelecionadoForex.resultadoConvertidoBRL < 0 && "-"}
              {formatarMoeda(Math.abs(mesSelecionadoForex.resultadoConvertidoBRL))}
            </p>
          </div>
          {mesSelecionadoForex.resultadoConvertidoBRL >= 0
            ? <TrendingUp className="h-6 w-6 text-emerald-400" />
            : <TrendingDown className="h-6 w-6 text-red-400" />}
        </div>
      </div>

      <GraficoCandlesForex
        relatorios={relatoriosForexRaw}
        mesSelecionado={{ ano: mesSelecionadoForex.ano, mes: mesSelecionadoForex.mesNumero }}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <CardResumoValor titulo="Resultado (USD)" valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.resultadoMesUSD)}`} destaque={mesSelecionadoForex.resultadoMesUSD < 0 ? "negativo" : "positivo"} />
        <CardResumoValor titulo="Depósito / Retirada (USD)" valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.depositoRetiradaUSD)}`} destaque={mesSelecionadoForex.depositoRetiradaUSD < 0 ? "negativo" : "positivo"} />
        <CardResumoValor titulo="Cotação Média (PTAX)" valor={`R$ ${mesSelecionadoForex.cotacaoMedia.toFixed(4)}`} />
        <CardResumoValor titulo="Imposto Estimado (15%)" valor={formatarMoeda(mesSelecionadoForex.impostoEstimado)} destaque="alerta" />
        <CardResumoValor titulo="DARF a Pagar" valor={formatarMoeda(mesSelecionadoForex.darfPagar)} destaque={mesSelecionadoForex.darfPagar > 0 ? "positivo" : "normal"} icone={<Receipt className="h-3 w-3" />} />
        <CardResumoValor titulo="Relatórios" valor={String(mesSelecionadoForex.quantidadeRelatorios)} />
      </div>
    </div>
  );

  // ─── Conteúdo Anual B3 ────────────────────────────────────────────────────

  const conteudoAnualB3 = resumosAnuaisB3.length === 0 ? estadoVazio : (
    <div className="flex flex-col gap-3">
      {resumosAnuaisB3.map((ano) => (
        <div key={ano.ano} className="rounded-[12px] border border-slate-700 bg-[#061538] p-4">
          <p className="text-lg font-semibold">{ano.ano}</p>
          <p className="mb-3 text-xs text-slate-400">{ano.quantidade} nota(s)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CardResumoValor titulo="Valor dos Negócios" valor={formatarMoeda(ano.valorNegocios)} />
            <CardResumoValor titulo="Custos" valor={formatarMoeda(ano.custos)} destaque="negativo" />
            <CardResumoValor titulo="IRRF" valor={formatarMoeda(ano.irrf)} destaque="alerta" />
            <CardResumoValor titulo="Resultado Líquido" valor={formatarMoeda(ano.liquido)} destaque={ano.liquido < 0 ? "negativo" : "positivo"} />
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Conteúdo Anual Forex ──────────────────────────────────────────────────

  const conteudoAnualForex = resumosForex.length === 0 ? estadoVazio : (
    <div className="flex flex-col gap-3">
      {/* agrupa por ano — simplificado */}
      <div className="rounded-[12px] border border-slate-700 bg-[#061538] p-4 text-sm text-slate-300">
        Veja o resumo anual detalhado em{" "}
        <button
          onClick={() => router.push("/dashboard/notas")}
          className="text-emerald-400 underline hover:text-emerald-300"
        >
          Minhas Notas → Resumo Anual
        </button>
      </div>
    </div>
  );

  // ─── Conteúdo principal ────────────────────────────────────────────────────

  const conteudo =
    viewMode === "mensal"
      ? mercado === "b3" ? conteudoMensalB3 : conteudoMensalForex
      : mercado === "b3" ? conteudoAnualB3 : conteudoAnualForex;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* MOBILE */}
      <div className="flex flex-col gap-4 px-4 py-4 lg:hidden">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Dashboard</p>
          <h1 className="mt-0.5 text-xl font-bold leading-tight">Resumo das Operações</h1>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleMudarMercado("b3")} className={`h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition ${mercado === "b3" ? "bg-emerald-500 text-white" : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"}`}>
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Brasil / B3
          </Button>
          <Button onClick={() => handleMudarMercado("forex")} className={`h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition ${mercado === "forex" ? "bg-emerald-500 text-white" : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"}`}>
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Forex
          </Button>
        </div>

        {abas}
        {seletorMeses}
        {conteudo}
      </div>

      {/* DESKTOP */}
      <div className="hidden h-[calc(100vh-56px)] gap-4 overflow-hidden px-4 py-4 lg:flex">
        {/* Coluna esquerda */}
        <div className="flex w-48 flex-shrink-0 flex-col gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Dashboard</p>
            <h1 className="mt-0.5 text-lg font-bold leading-tight tracking-tight">
              Resumo das<br />Operações
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              Acompanhe seus resultados e o imposto a pagar.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Button onClick={() => handleMudarMercado("b3")} className={`h-9 w-full justify-start rounded-lg px-3 text-xs font-semibold transition ${mercado === "b3" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"}`}>
              <BarChart3 className="mr-2 h-3.5 w-3.5" /> Brasil / B3
            </Button>
            <Button onClick={() => handleMudarMercado("forex")} className={`h-9 w-full justify-start rounded-lg px-3 text-xs font-semibold transition ${mercado === "forex" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"}`}>
              <TrendingUp className="mr-2 h-3.5 w-3.5" /> Forex / Internacional
            </Button>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {abas}
          {seletorMeses}
          {conteudo}
        </div>
      </div>
    </>
  );
}
