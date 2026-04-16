"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  listarNotasB3,
  listarNotasForex,
  type NotaB3Banco,
  type NotaForexBanco,
} from "@/lib/supabase/notas";
import {
  calcularFechamentosMensaisForex,
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
import Link from "next/link";
import { GraficoCandlesMensal } from "@/components/dashboard/GraficoCandlesMensal";

type MercadoSelecionado = "b3" | "forex";

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

const STORAGE_KEY_CONFIG = "irtrade_configuracoes_corretora";
const ALIQUOTA_DAY_TRADE = 0.2;

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const NOMES_MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarNumeroUsd(valor: number) {
  return valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    destaque === "positivo"
      ? "text-emerald-400"
      : destaque === "negativo"
      ? "text-red-400"
      : destaque === "alerta"
      ? "text-yellow-400"
      : "text-white";

  return (
    <div className="rounded-[16px] bg-[#0c1d45] p-4">
      <div className="flex items-center gap-2">
        {icone && <span className="text-slate-400">{icone}</span>}
        <p className="text-xs text-slate-300 md:text-sm">{titulo}</p>
      </div>
      <p className={`mt-2 text-lg font-semibold md:text-xl ${cor}`}>{valor}</p>
    </div>
  );
}

export default function DashboardHomePage() {
  const [mercadoSelecionado, setMercadoSelecionado] = useState<MercadoSelecionado>("b3");
  const [carregando, setCarregando] = useState(true);
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [resumosForex, setResumosForex] = useState<ResumoMensalForex[]>([]);
  const [chaveMesSelecionado, setChaveMesSelecionado] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        const config = getConfigFromStorage();
        if (config.mercado === "forex") {
          setMercadoSelecionado("forex");
        }

        const [b3, forex] = await Promise.all([
          listarNotasB3(),
          listarNotasForex(),
        ]);

        setNotasB3(b3.map(mapNotaB3BancoParaLocal));

        if (forex.length > 0) {
          const relatorios = forex.map((nota) => ({
            id: nota.id,
            data: normalizarDataForexParaCalculo(nota.data_relatorio ?? ""),
            saldoInicial: Number(nota.saldo_inicial_usd ?? 0),
            resultadoDia: Number(nota.resultado_dia_usd ?? 0),
            depositoRetirada: Number(nota.deposito_retirada_usd ?? 0),
            saldoFinal: Number(nota.saldo_final_usd ?? 0),
          }));
          const resultados = await calcularFechamentosMensaisForex(relatorios);
          setResumosForex(resultados);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  // Calcular resumos mensais B3
  const resumosMensaisB3 = useMemo<ResumoMensal[]>(() => {
    const mapa = new Map<string, ResumoMensal>();

    for (const nota of notasB3) {
      const { mes, ano } = parseDataPregao(nota.dataPregao);
      const chave = `${ano}-${String(mes).padStart(2, "0")}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          ano,
          mes,
          label: `${NOMES_MESES[mes - 1]} ${ano}`,
          labelCurto: `${NOMES_MESES_CURTOS[mes - 1]}/${ano}`,
          quantidade: 0,
          valorNegocios: 0,
          custos: 0,
          irrf: 0,
          liquido: 0,
          prejuizoAcumuladoAnterior: 0,
          baseTributavel: 0,
          impostoEstimado: 0,
          impostoAPagar: 0,
          prejuizoAcumuladoFinal: 0,
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
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        return a.mes - b.mes;
      });

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

  // Selecionar o mês mais recente automaticamente
  useEffect(() => {
    if (mercadoSelecionado === "b3" && resumosMensaisB3.length > 0 && !chaveMesSelecionado) {
      setChaveMesSelecionado(resumosMensaisB3[0].chave);
    }
    if (mercadoSelecionado === "forex" && resumosForex.length > 0 && !chaveMesSelecionado) {
      setChaveMesSelecionado(resumosForex[0].chave);
    }
  }, [mercadoSelecionado, resumosMensaisB3, resumosForex, chaveMesSelecionado]);

  const mesSelecionadoB3 = resumosMensaisB3.find((m) => m.chave === chaveMesSelecionado) || resumosMensaisB3[0] || null;
  const mesSelecionadoForex = resumosForex.find((m) => m.chave === chaveMesSelecionado) || resumosForex[0] || null;

  function handleMudarMercado(mercado: MercadoSelecionado) {
    setMercadoSelecionado(mercado);
    setConfigToStorage(mercado);
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

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Resumo das Operações
        </h1>
        <p className="mt-1 text-sm text-slate-300 md:text-base">
          Acompanhe o resultado das suas operações e o imposto a pagar.
        </p>
      </div>

      {/* Seletor de Mercado */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          onClick={() => handleMudarMercado("b3")}
          className={`h-12 rounded-xl px-6 text-sm font-semibold transition ${
            mercadoSelecionado === "b3"
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
          }`}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Brasil / B3
        </Button>
        <Button
          onClick={() => handleMudarMercado("forex")}
          className={`h-12 rounded-xl px-6 text-sm font-semibold transition ${
            mercadoSelecionado === "forex"
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
          }`}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Forex / Internacional
        </Button>
      </div>

      {/* Seletor de Meses B3 */}
      {mercadoSelecionado === "b3" && resumosMensaisB3.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-slate-400">Selecione o mês:</p>
          <div className="flex flex-wrap gap-2">
            {resumosMensaisB3.map((mes) => (
              <Button
                key={mes.chave}
                onClick={() => handleSelecionarMes(mes.chave)}
                className={`h-10 rounded-lg px-4 text-sm font-medium transition ${
                  chaveMesSelecionado === mes.chave
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
                }`}
              >
                {mes.labelCurto}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Seletor de Meses Forex */}
      {mercadoSelecionado === "forex" && resumosForex.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-slate-400">Selecione o mês:</p>
          <div className="flex flex-wrap gap-2">
            {resumosForex.map((mes) => (
              <Button
                key={mes.chave}
                onClick={() => handleSelecionarMes(mes.chave)}
                className={`h-10 rounded-lg px-4 text-sm font-medium transition ${
                  chaveMesSelecionado === mes.chave
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
                }`}
              >
                {mes.mes}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Card de Resumo do Mês */}
      <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-5 md:p-6">
        {/* Título do Mês */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold md:text-2xl">
            {mercadoSelecionado === "b3"
              ? mesSelecionadoB3?.label || "Nenhum mês disponível"
              : mesSelecionadoForex?.mes || "Nenhum mês disponível"}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {mercadoSelecionado === "b3"
              ? mesSelecionadoB3
                ? `${mesSelecionadoB3.quantidade} nota(s) importada(s)`
                : "Importe suas notas para ver o resumo"
              : mesSelecionadoForex
              ? `${mesSelecionadoForex.quantidadeRelatorios} relatório(s) importado(s)`
              : "Importe seus relatórios para ver o resumo"}
          </p>
        </div>

        {/* Conteúdo B3 */}
        {mercadoSelecionado === "b3" && (
          <>
            {!mesSelecionadoB3 ? (
              <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-500" />
                <p className="mt-4 text-slate-300">
                  Nenhuma nota importada ainda.
                </p>
                <Link
                  href="/dashboard/upload"
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Importar Nota
                </Link>
              </div>
            ) : (
              <>
                {/* Resultado Principal */}
                <div className="mb-6 rounded-[18px] border border-slate-700 bg-[#081733] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Resultado Líquido do Mês</p>
                      <p
                        className={`mt-1 text-3xl font-bold md:text-4xl ${
                          mesSelecionadoB3.liquido < 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {mesSelecionadoB3.liquido < 0 && "-"}
                        {formatarMoeda(Math.abs(mesSelecionadoB3.liquido))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mesSelecionadoB3.liquido >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards de Detalhes */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CardResumoValor
                    titulo="Valor dos Negócios"
                    valor={formatarMoeda(mesSelecionadoB3.valorNegocios)}
                    icone={<BarChart3 className="h-4 w-4" />}
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

                {/* Cards de Imposto */}
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                    icone={<Receipt className="h-4 w-4" />}
                  />
                </div>

                {/* ✅ Gráfico de Candles por Dia */}
                <GraficoCandlesMensal
                  notas={notasB3}
                  mesSelecionado={
                    mesSelecionadoB3
                      ? { ano: mesSelecionadoB3.ano, mes: mesSelecionadoB3.mes }
                      : null
                  }
                />
              </>
            )}
          </>
        )}

        {/* Conteúdo Forex */}
        {mercadoSelecionado === "forex" && (
          <>
            {!mesSelecionadoForex ? (
              <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-500" />
                <p className="mt-4 text-slate-300">
                  Nenhum relatório Forex importado ainda.
                </p>
                <Link
                  href="/dashboard/upload"
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  Importar Relatório
                </Link>
              </div>
            ) : (
              <>
                {/* Resultado Principal */}
                <div className="mb-6 rounded-[18px] border border-slate-700 bg-[#081733] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Resultado do Mês (BRL)</p>
                      <p
                        className={`mt-1 text-3xl font-bold md:text-4xl ${
                          mesSelecionadoForex.resultadoConvertidoBRL < 0
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatarMoeda(mesSelecionadoForex.resultadoConvertidoBRL)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {mesSelecionadoForex.resultadoConvertidoBRL >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards de Detalhes Forex */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <CardResumoValor
                    titulo="Resultado (USD)"
                    valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.resultadoMesUSD)}`}
                    destaque={
                      mesSelecionadoForex.resultadoMesUSD < 0
                        ? "negativo"
                        : mesSelecionadoForex.resultadoMesUSD > 0
                        ? "positivo"
                        : "normal"
                    }
                  />
                  <CardResumoValor
                    titulo="Depósito / Retirada (USD)"
                    valor={`$ ${formatarNumeroUsd(mesSelecionadoForex.depositoRetiradaUSD)}`}
                    destaque={
                      mesSelecionadoForex.depositoRetiradaUSD < 0
                        ? "negativo"
                        : mesSelecionadoForex.depositoRetiradaUSD > 0
                        ? "positivo"
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
                    icone={<Receipt className="h-4 w-4" />}
                  />
                  <CardResumoValor
                    titulo="Relatórios"
                    valor={String(mesSelecionadoForex.quantidadeRelatorios)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Links Rápidos */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-[#061538] p-4 transition hover:border-emerald-500/50 hover:bg-[#081733]"
        >
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Importar Nota</p>
            <p className="text-sm text-slate-400">Upload de PDF ou EML</p>
          </div>
        </Link>

        <Link
          href="/dashboard/upload?aba=mensal"
          className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-[#061538] p-4 transition hover:border-emerald-500/50 hover:bg-[#081733]"
        >
          <div className="rounded-full bg-cyan-500/10 p-3 text-cyan-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Resumo Mensal</p>
            <p className="text-sm text-slate-400">Ver detalhes e DARF</p>
          </div>
        </Link>

        <Link
          href="/dashboard/upload?aba=notas"
          className="flex items-center gap-4 rounded-[16px] border border-slate-800 bg-[#061538] p-4 transition hover:border-emerald-500/50 hover:bg-[#081733]"
        >
          <div className="rounded-full bg-violet-500/10 p-3 text-violet-400">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Notas Salvas</p>
            <p className="text-sm text-slate-400">Gerenciar histórico</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
