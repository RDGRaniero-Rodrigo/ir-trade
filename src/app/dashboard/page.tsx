// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { GraficoCandlesMensal } from "@/components/dashboard/GraficoCandlesMensal";
import { GraficoCandlesForex } from "@/components/dashboard/GraficoCandlesForex";
import { UploadInline } from "@/components/dashboard/UploadInline";

// ─── Types ────────────────────────────────────────────────────────────────────

type MercadoSelecionado = "b3" | "forex";
type ViewMode = "dashboard" | "upload";

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
  labelCurto: string;
  quantidade: number;
  valorNegocios: number;
  custos: number;
  irrf: number;
  liquido: number;
  prejuizoAcumuladoAnterior: number;
  baseTributavel: number;
  impostoEstimado: number;
  impostoAPagar: number;
  prejuizoAcumuladoFinal: number;
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

function round2(valor: number) {
  return Number(valor.toFixed(2));
}

function parseDataPregao(data: string) {
  const [dia, mes, ano] = data.split("/").map(Number);
  return { dia, mes, ano };
}

function normalizarDataForexParaCalculo(dataRelatorio: string) {
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

function mapNotaB3BancoParaLocal(nota: NotaB3Banco): NotaSalva {
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

// ─── Componente CardResumoValor ───────────────────────────────────────────────

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

export default function DashboardHomePage() {
  const [mercadoSelecionado, setMercadoSelecionado] = useState<MercadoSelecionado>("b3");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [carregando, setCarregando] = useState(true);
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [resumosForex, setResumosForex] = useState<ResumoMensalForex[]>([]);
  const [relatoriosForexRaw, setRelatoriosForexRaw] = useState<RelatorioForex[]>([]);
  const [chaveMesSelecionado, setChaveMesSelecionado] = useState<string | null>(null);

  // ─── Carregamento de dados ─────────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const [b3, forex] = await Promise.all([listarNotasB3(), listarNotasForex()]);
      setNotasB3(b3.map(mapNotaB3BancoParaLocal));

      if (forex.length > 0) {
        const relatorios: RelatorioForex[] = forex.map((nota) => ({
          id: nota.id,
          data: normalizarDataForexParaCalculo(nota.data_relatorio ?? ""),
          saldoInicial: Number(nota.saldo_inicial_usd ?? 0),
          resultadoDia: Number(nota.resultado_dia_usd ?? 0),
          depositoRetirada: Number(nota.deposito_retirada_usd ?? 0),
          saldoFinal: Number(nota.saldo_final_usd ?? 0),
        }));
        setRelatoriosForexRaw(relatorios);
        const resultados = await calcularFechamentosMensaisForex(relatorios);
        setResumosForex(resultados);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const config = getConfigFromStorage();
    if (config.mercado === "forex") setMercadoSelecionado("forex");
    carregarDados();
  }, [carregarDados]);

  // ─── Após upload bem-sucedido ──────────────────────────────────────────────

  async function handleUploadSuccess() {
    setViewMode("dashboard");
    await carregarDados();
  }

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
          labelCurto: `${NOMES_MESES_CURTOS[mes - 1]}/${ano}`,
          quantidade: 0, valorNegocios: 0, custos: 0, irrf: 0, liquido: 0,
          prejuizoAcumuladoAnterior: 0, baseTributavel: 0,
          impostoEstimado: 0, impostoAPagar: 0, prejuizoAcumuladoFinal: 0,
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

    let prejuizoAcumulado = 0;
    for (const item of ordenado) {
      item.prejuizoAcumuladoAnterior = round2(prejuizoAcumulado);
      if (item.liquido < 0) {
        item.prejuizoAcumuladoFinal = round2(prejuizoAcumulado + Math.abs(item.liquido));
      } else if (item.liquido > 0) {
        item.baseTributavel = round2(Math.max(0, item.liquido - prejuizoAcumulado));
        item.impostoEstimado = round2(item.baseTributavel * ALIQUOTA_DAY_TRADE);
        item.impostoAPagar = round2(Math.max(0, item.impostoEstimado - item.irrf));
        item.prejuizoAcumuladoFinal = round2(Math.max(0, prejuizoAcumulado - item.liquido));
      }
      prejuizoAcumulado = item.prejuizoAcumuladoFinal;
    }

    return ordenado.reverse();
  }, [notasB3]);

  // ─── Seleciona mês inicial ─────────────────────────────────────────────────

  useEffect(() => {
    if (mercadoSelecionado === "b3" && resumosMensaisB3.length > 0 && !chaveMesSelecionado) {
      setChaveMesSelecionado(resumosMensaisB3[0].chave);
    }
    if (mercadoSelecionado === "forex" && resumosForex.length > 0 && !chaveMesSelecionado) {
      setChaveMesSelecionado(resumosForex[0].chave);
    }
  }, [mercadoSelecionado, resumosMensaisB3, resumosForex, chaveMesSelecionado]);

  const mesSelecionadoB3 =
    resumosMensaisB3.find((m) => m.chave === chaveMesSelecionado) ||
    resumosMensaisB3[0] ||
    null;

  const mesSelecionadoForex =
    resumosForex.find((m) => m.chave === chaveMesSelecionado) ||
    resumosForex[0] ||
    null;

  function handleMudarMercado(mercado: MercadoSelecionado) {
    setMercadoSelecionado(mercado);
    setConfigToStorage(mercado);
    setViewMode("dashboard");
    if (mercado === "b3" && resumosMensaisB3.length > 0) {
      setChaveMesSelecionado(resumosMensaisB3[0].chave);
    } else if (mercado === "forex" && resumosForex.length > 0) {
      setChaveMesSelecionado(resumosForex[0].chave);
    } else {
      setChaveMesSelecionado(null);
    }
  }

  function handleSelecionarMes(chave: string) {
    setChaveMesSelecionado(chave);
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

  // ─── Seletor de meses ──────────────────────────────────────────────────────

  const seletorMeses = (
    <div className="flex flex-wrap gap-1.5">
      {mercadoSelecionado === "b3" &&
        resumosMensaisB3.map((mes) => (
          <button
            key={mes.chave}
            onClick={() => handleSelecionarMes(mes.chave)}
            className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
              chaveMesSelecionado === mes.chave
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            {mes.label}
          </button>
        ))}
      {mercadoSelecionado === "forex" &&
        resumosForex.map((mes) => (
          <button
            key={mes.chave}
            onClick={() => handleSelecionarMes(mes.chave)}
            className={`h-8 rounded-lg px-3 text-xs font-medium transition ${
              chaveMesSelecionado === mes.chave
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            {mes.mes}
          </button>
        ))}
    </div>
  );

  // ─── Conteúdo B3 ──────────────────────────────────────────────────────────

  const conteudoB3 = !mesSelecionadoB3 ? (
    <div className="flex min-h-[200px] items-center justify-center rounded-[16px] border border-slate-800 bg-[#061538]">
      <div className="text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-500" />
        <p className="mt-3 text-sm text-slate-300">Nenhuma nota importada ainda.</p>
        <button
          onClick={() => setViewMode("upload")}
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-xs font-medium text-white transition hover:bg-emerald-600"
        >
          Importar Nota
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {/* Resultado */}
      <div className="rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {mesSelecionadoB3.label}
              <span className="ml-2 normal-case text-slate-600">
                · {mesSelecionadoB3.quantidade} nota(s)
              </span>
            </p>
            <p className={`mt-0.5 text-2xl font-bold ${
              mesSelecionadoB3.liquido < 0 ? "text-red-400" : "text-emerald-400"
            }`}>
              {mesSelecionadoB3.liquido < 0 && "-"}
              {formatarMoeda(Math.abs(mesSelecionadoB3.liquido))}
            </p>
          </div>
          {mesSelecionadoB3.liquido >= 0 ? (
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-400" />
          )}
        </div>
      </div>

      {/* Gráfico B3 */}
      <GraficoCandlesMensal
        notas={notasB3}
        mesSelecionado={{ ano: mesSelecionadoB3.ano, mes: mesSelecionadoB3.mes }}
      />

      {/* Cards linha 1 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CardResumoValor
          titulo="Valor dos Negócios"
          valor={formatarMoeda(mesSelecionadoB3.valorNegocios)}
          icone={<BarChart3 className="h-3 w-3" />}
        />
        <CardResumoValor
          titulo="Custos"
          valor={formatarMoeda(mesSelecionadoB3.custos)}
          destaque="negativo"
        />
        <CardResumoValor
          titulo="IRRF (Dedo-duro)"
          valor={formatarMoeda(mesSelecionadoB3.irrf)}
          destaque="alerta"
        />
        <CardResumoValor
          titulo="Notas Importadas"
          valor={String(mesSelecionadoB3.quantidade)}
        />
      </div>

      {/* Cards linha 2 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CardResumoValor
          titulo="Prejuízo Acumulado"
          valor={formatarMoeda(mesSelecionadoB3.prejuizoAcumuladoFinal)}
          destaque={mesSelecionadoB3.prejuizoAcumuladoFinal > 0 ? "negativo" : "normal"}
        />
        <CardResumoValor
          titulo="Imposto Estimado (20%)"
          valor={formatarMoeda(mesSelecionadoB3.impostoEstimado)}
          destaque="alerta"
        />
        <CardResumoValor
          titulo="DARF a Pagar"
          valor={formatarMoeda(mesSelecionadoB3.impostoAPagar)}
          destaque={mesSelecionadoB3.impostoAPagar > 0 ? "positivo" : "normal"}
          icone={<Receipt className="h-3 w-3" />}
        />
      </div>
    </div>
  );

  // ─── Conteúdo Forex ────────────────────────────────────────────────────────

  const conteudoForex = !mesSelecionadoForex ? (
    <div className="flex min-h-[200px] items-center justify-center rounded-[16px] border border-slate-800 bg-[#061538]">
      <div className="text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-500" />
        <p className="mt-3 text-sm text-slate-300">Nenhum relatório importado.</p>
        <button
          onClick={() => setViewMode("upload")}
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-xs font-medium text-white transition hover:bg-emerald-600"
        >
          Importar Relatório
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {/* Resultado Forex */}
      <div className="rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {mesSelecionadoForex.mes}
              <span className="ml-2 normal-case text-slate-600">
                · {mesSelecionadoForex.quantidadeRelatorios} relatório(s)
              </span>
            </p>
            <p className={`mt-0.5 text-2xl font-bold ${
              mesSelecionadoForex.resultadoConvertidoBRL < 0
                ? "text-red-400"
                : "text-emerald-400"
            }`}>
              {mesSelecionadoForex.resultadoConvertidoBRL < 0 && "-"}
              {formatarMoeda(Math.abs(mesSelecionadoForex.resultadoConvertidoBRL))}
            </p>
          </div>
          {mesSelecionadoForex.resultadoConvertidoBRL >= 0 ? (
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-400" />
          )}
        </div>
      </div>

      {/* Gráfico Forex */}
      <GraficoCandlesForex
        relatorios={relatoriosForexRaw}
        mesSelecionado={{
          ano: mesSelecionadoForex.ano,
          mes: mesSelecionadoForex.mesNumero,
        }}
      />

      {/* Cards linha 1 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <CardResumoValor
          titulo="Resultado (USD)"
          valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.resultadoMesUSD)}`}
          destaque={
            mesSelecionadoForex.resultadoMesUSD < 0 ? "negativo"
            : mesSelecionadoForex.resultadoMesUSD > 0 ? "positivo"
            : "normal"
          }
        />
        <CardResumoValor
          titulo="Depósito / Retirada (USD)"
          valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.depositoRetiradaUSD)}`}
          destaque={
            mesSelecionadoForex.depositoRetiradaUSD < 0 ? "negativo"
            : mesSelecionadoForex.depositoRetiradaUSD > 0 ? "positivo"
            : "normal"
          }
        />
        <CardResumoValor
          titulo="Cotação Média (PTAX)"
          valor={`R$ ${mesSelecionadoForex.cotacaoMedia.toFixed(4)}`}
        />
        <CardResumoValor
          titulo="Imposto Estimado (15%)"
          valor={formatarMoeda(mesSelecionadoForex.impostoEstimado)}
          destaque="alerta"
        />
        <CardResumoValor
          titulo="DARF a Pagar"
          valor={formatarMoeda(mesSelecionadoForex.darfPagar)}
          destaque={mesSelecionadoForex.darfPagar > 0 ? "positivo" : "normal"}
          icone={<Receipt className="h-3 w-3" />}
        />
        <CardResumoValor
          titulo="Relatórios"
          valor={String(mesSelecionadoForex.quantidadeRelatorios)}
        />
      </div>
    </div>
  );

  // ─── Conteúdo principal (dashboard ou upload) ──────────────────────────────

  const conteudoPrincipal =
    viewMode === "upload" ? (
      <UploadInline
        onClose={() => setViewMode("dashboard")}
        onUploadSuccess={handleUploadSuccess}
      />
    ) : mercadoSelecionado === "b3" ? (
      conteudoB3
    ) : (
      conteudoForex
    );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ============================================================
          MOBILE  (< lg)
      ============================================================ */}
      <div className="flex flex-col gap-4 px-4 py-4 lg:hidden">

        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Dashboard</p>
          <h1 className="mt-0.5 text-xl font-bold leading-tight">Resumo das Operações</h1>
          <p className="mt-1 text-xs text-slate-400">
            Acompanhe o resultado das suas operações e o imposto a pagar.
          </p>
        </div>

        {/* Botões de Mercado */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleMudarMercado("b3")}
            className={`h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition ${
              mercadoSelecionado === "b3"
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Brasil / B3
          </Button>
          <Button
            onClick={() => handleMudarMercado("forex")}
            className={`h-9 flex-1 rounded-lg px-3 text-xs font-semibold transition ${
              mercadoSelecionado === "forex"
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Forex
          </Button>
        </div>

        {/* Seletor de meses — esconde durante upload */}
        {viewMode === "dashboard" && seletorMeses}

        {/* Conteúdo principal */}
        {conteudoPrincipal}

        {/* Links rápidos */}
        <div className="border-t border-slate-700/50 pt-2">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">Acesso rápido</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setViewMode("upload")}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-[10px] text-slate-300 transition ${
                viewMode === "upload"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-slate-800 bg-[#061538] hover:border-emerald-500/50"
              }`}
            >
              <FileText className="h-4 w-4 text-emerald-400" />
              Importar Nota
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-[#061538] px-2 py-3 text-center text-[10px] text-slate-300 transition hover:border-emerald-500/50"
            >
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Resumo Mensal
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-[#061538] px-2 py-3 text-center text-[10px] text-slate-300 transition hover:border-emerald-500/50"
            >
              <Receipt className="h-4 w-4 text-violet-400" />
              Notas Salvas
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          DESKTOP (>= lg)
      ============================================================ */}
      <div className="hidden h-[calc(100vh-56px)] gap-4 overflow-hidden px-4 py-4 lg:flex">

        {/* Coluna esquerda */}
        <div className="flex w-48 flex-shrink-0 flex-col gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Dashboard</p>
            <h1 className="mt-0.5 text-lg font-bold leading-tight tracking-tight">
              Resumo das<br />Operações
            </h1>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              Acompanhe o resultado das suas operações e o imposto a pagar.
            </p>
          </div>

          {/* Botões de mercado */}
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={() => handleMudarMercado("b3")}
              className={`h-9 w-full justify-start rounded-lg px-3 text-xs font-semibold transition ${
                mercadoSelecionado === "b3" && viewMode === "dashboard"
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
              }`}
            >
              <BarChart3 className="mr-2 h-3.5 w-3.5" />
              Brasil / B3
            </Button>
            <Button
              onClick={() => handleMudarMercado("forex")}
              className={`h-9 w-full justify-start rounded-lg px-3 text-xs font-semibold transition ${
                mercadoSelecionado === "forex" && viewMode === "dashboard"
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
              }`}
            >
              <TrendingUp className="mr-2 h-3.5 w-3.5" />
              Forex / Internacional
            </Button>
          </div>

          <div className="border-t border-slate-700/50" />

          {/* Acesso rápido */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Acesso rápido</p>

            <button
              onClick={() => setViewMode("upload")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                viewMode === "upload"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-800 bg-[#061538] hover:border-emerald-500/50 hover:bg-[#081733]"
              }`}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              <span className={viewMode === "upload" ? "text-emerald-400" : "text-slate-300"}>
                Importar Nota
              </span>
            </button>

            <button
              onClick={() => setViewMode("dashboard")}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#061538] px-3 py-2 text-xs transition hover:border-emerald-500/50 hover:bg-[#081733]"
            >
              <BarChart3 className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
              <span className="text-slate-300">Resumo Mensal</span>
            </button>

            <button
              onClick={() => setViewMode("dashboard")}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#061538] px-3 py-2 text-xs transition hover:border-emerald-500/50 hover:bg-[#081733]"
            >
              <Receipt className="h-3.5 w-3.5 flex-shrink-0 text-violet-400" />
              <span className="text-slate-300">Notas Salvas</span>
            </button>
          </div>
        </div>

        {/* Coluna direita — scroll interno */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {/* Seletor de meses — esconde durante upload */}
          {viewMode === "dashboard" && seletorMeses}

          {/* Conteúdo principal */}
          {conteudoPrincipal}
        </div>
      </div>
    </>
  );
}
