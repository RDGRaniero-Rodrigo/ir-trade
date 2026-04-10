"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calcularFechamentosMensaisForex,
  type ResumoMensalForex,
} from "@/lib/calculo-forex";
import {
  listarNotasB3,
  listarNotasForex,
  type NotaB3Banco,
  type NotaForexBanco,
} from "@/lib/supabase/notas";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
  createdAt: string;
};

type NotaForexSalva = {
  id: string;
  dataRelatorio: string;
  conta: string;
  cliente: string;
  moeda: string;
  ativoPrincipal: string | null;
  saldoInicialUsd: number;
  depositoRetiradaUsd: number;
  resultadoDiaUsd: number;
  saldoFinalUsd: number;
  equityFinalUsd: number;
  floatingUsd: number;
  createdAt: string;
};

const STORAGE_KEY_CONFIG = "irtrade_configuracoes_corretora";

function round2(valor: number) {
  return Number(valor.toFixed(2));
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarNumeroUsd(valor: number) {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarDataForexParaCalculo(dataRelatorio: string) {
  const match = dataRelatorio.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function CardResumo({
  titulo,
  valor,
  destaque = "normal",
}: {
  titulo: string;
  valor: string;
  destaque?: "normal" | "positivo" | "negativo" | "alerta";
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
      <p className="text-xs text-slate-300 md:text-sm">{titulo}</p>
      <p className={`mt-2 text-lg font-semibold md:text-xl ${cor}`}>{valor}</p>
    </div>
  );
}

function BotaoMercado({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl px-5 text-sm font-semibold transition ${
        ativo
          ? "bg-emerald-500 text-white"
          : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function BotaoAbaDashboard({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-xl bg-[#0c1d45] px-6 md:px-7 text-sm font-semibold text-slate-300 transition hover:bg-[#122552] hover:text-white"
    >
      {children}
    </Link>
  );
}

function mapNotaB3BancoParaLocal(nota: NotaB3Banco): NotaSalva {
  let dataPregao = "";

  if (nota.data_pregao) {
    const partes = nota.data_pregao.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      dataPregao = `${dia}/${mes}/${ano}`;
    }
  }

  return {
    id: nota.id,
    numeroNota: nota.numero_nota ?? "",
    dataPregao,
    cliente: nota.cliente ?? "",
    valorNegocios: Number(nota.valor_negocios ?? 0),
    irrf: Number(nota.irrf ?? 0),
    custos: Number(nota.custos ?? 0),
    valorLiquido: Number(nota.valor_liquido ?? 0),
    sinalLiquido: nota.sinal_liquido,
    createdAt: nota.created_at,
  };
}

function mapNotaForexBancoParaLocal(nota: NotaForexBanco): NotaForexSalva {
  return {
    id: nota.id,
    dataRelatorio: nota.data_relatorio ?? "",
    conta: nota.conta ?? "",
    cliente: nota.cliente ?? "",
    moeda: nota.moeda ?? "",
    ativoPrincipal: nota.ativo_principal,
    saldoInicialUsd: Number(nota.saldo_inicial_usd ?? 0),
    depositoRetiradaUsd: Number(nota.deposito_retirada_usd ?? 0),
    resultadoDiaUsd: Number(nota.resultado_dia_usd ?? 0),
    saldoFinalUsd: Number(nota.saldo_final_usd ?? 0),
    equityFinalUsd: Number(nota.equity_final_usd ?? 0),
    floatingUsd: Number(nota.floating_usd ?? 0),
    createdAt: nota.created_at,
  };
}

export default function DashboardHomePage() {
  const [mercadoSelecionado, setMercadoSelecionado] =
    useState<MercadoSelecionado>("b3");
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [notasForex, setNotasForex] = useState<NotaForexSalva[]>([]);
  const [resumosMensaisForex, setResumosMensaisForex] = useState<
    ResumoMensalForex[]
  >([]);
  const [carregandoB3, setCarregandoB3] = useState(false);
  const [carregandoForex, setCarregandoForex] = useState(false);
  const [erroB3, setErroB3] = useState("");
  const [erroForex, setErroForex] = useState("");

  useEffect(() => {
    try {
      const config = JSON.parse(
        localStorage.getItem(STORAGE_KEY_CONFIG) || "{}"
      );

      if (config.mercado === "forex") {
        setMercadoSelecionado("forex");
      } else {
        setMercadoSelecionado("b3");
      }
    } catch {
      setMercadoSelecionado("b3");
    }
  }, []);

  useEffect(() => {
    async function carregarNotasDoBanco() {
      try {
        setCarregandoB3(true);
        setErroB3("");

        const data = await listarNotasB3();
        const notasConvertidas = data.map(mapNotaB3BancoParaLocal);
        setNotasB3(notasConvertidas);
      } catch (error) {
        console.error(error);
        setErroB3("Não foi possível carregar as notas B3.");
        setNotasB3([]);
      } finally {
        setCarregandoB3(false);
      }
    }

    carregarNotasDoBanco();
  }, []);

  useEffect(() => {
    async function carregarForexDoBanco() {
      if (mercadoSelecionado !== "forex") return;

      try {
        setCarregandoForex(true);
        setErroForex("");

        const data = await listarNotasForex();
        const notasConvertidas = data.map(mapNotaForexBancoParaLocal);
        setNotasForex(notasConvertidas);

        const relatorios = notasConvertidas.map((nota) => ({
          id: nota.id,
          data: normalizarDataForexParaCalculo(nota.dataRelatorio),
          saldoInicial: nota.saldoInicialUsd,
          resultadoDia: nota.resultadoDiaUsd,
          depositoRetirada: nota.depositoRetiradaUsd,
          saldoFinal: nota.saldoFinalUsd,
        }));

        const resultados = await calcularFechamentosMensaisForex(relatorios);
        setResumosMensaisForex(resultados);
      } catch (error) {
        console.error(error);
        setErroForex("Não foi possível carregar os relatórios Forex.");
        setNotasForex([]);
        setResumosMensaisForex([]);
      } finally {
        setCarregandoForex(false);
      }
    }

    carregarForexDoBanco();
  }, [mercadoSelecionado]);

  function selecionarMercado(mercado: MercadoSelecionado) {
    setMercadoSelecionado(mercado);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY_CONFIG,
        JSON.stringify({
          mercado,
        })
      );
    }
  }

  const resumoB3 = useMemo(() => {
    const totalLiquido = notasB3.reduce((acc, nota) => {
      return (
        acc + (nota.sinalLiquido === "D" ? -nota.valorLiquido : nota.valorLiquido)
      );
    }, 0);

    const totalCustos = notasB3.reduce((acc, nota) => acc + nota.custos, 0);
    const totalIrrf = notasB3.reduce((acc, nota) => acc + nota.irrf, 0);

    return {
      quantidade: notasB3.length,
      totalLiquido: round2(totalLiquido),
      totalCustos: round2(totalCustos),
      totalIrrf: round2(totalIrrf),
    };
  }, [notasB3]);

  const resumoForex = useMemo(() => {
    const totalResultadoUsd = notasForex.reduce(
      (acc, nota) => acc + nota.resultadoDiaUsd,
      0
    );

    const totalDepositoRetiradaUsd = notasForex.reduce(
      (acc, nota) => acc + nota.depositoRetiradaUsd,
      0
    );

    const ultimoSaldo =
      notasForex.length > 0
        ? notasForex
            .slice()
            .sort((a, b) => a.dataRelatorio.localeCompare(b.dataRelatorio))
            .at(-1)?.saldoFinalUsd ?? 0
        : 0;

    return {
      quantidade: notasForex.length,
      totalResultadoUsd: round2(totalResultadoUsd),
      totalDepositoRetiradaUsd: round2(totalDepositoRetiradaUsd),
      ultimoSaldoUsd: round2(ultimoSaldo),
    };
  }, [notasForex]);

  function handleExportarBackup() {
    try {
      const dados =
        mercadoSelecionado === "forex"
          ? JSON.stringify(notasForex, null, 2)
          : JSON.stringify(notasB3, null, 2);

      const blob = new Blob([dados], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const agora = new Date();
      const prefixo =
        mercadoSelecionado === "forex" ? "irtrade-forex" : "irtrade-b3";
      const nomeArquivo = `${prefixo}-backup-${agora.getFullYear()}-${String(
        agora.getMonth() + 1
      ).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-7">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Visão Geral
          </h1>
          <p className="mt-1 text-sm text-slate-300 md:text-base">
            Escolha o mercado e veja os dados carregados abaixo.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <BotaoMercado
            ativo={mercadoSelecionado === "b3"}
            onClick={() => selecionarMercado("b3")}
          >
            B3
          </BotaoMercado>

          <BotaoMercado
            ativo={mercadoSelecionado === "forex"}
            onClick={() => selecionarMercado("forex")}
          >
            Forex
          </BotaoMercado>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <BotaoAbaDashboard href="/dashboard/upload">
            Importar Nota
          </BotaoAbaDashboard>
          <BotaoAbaDashboard href="/dashboard/upload?aba=mensal">
            Resumo Mensal
          </BotaoAbaDashboard>
          <BotaoAbaDashboard href="/dashboard/upload?aba=anual">
            Resumo Anual
          </BotaoAbaDashboard>
          <BotaoAbaDashboard href="/dashboard/notas">
            Notas Salvas
          </BotaoAbaDashboard>
        </div>

        {mercadoSelecionado === "b3" ? (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold md:text-2xl">
                  Resumo Geral B3
                </h2>
                <p className="mt-1 text-sm text-slate-300 md:text-base">
                  Acumulado das notas B3 do usuário logado.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportarBackup}
                  disabled={notasB3.length === 0}
                  className="h-10 rounded-lg border-slate-600 bg-transparent px-4 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar backup
                </Button>
              </div>
            </div>

            {carregandoB3 && (
              <p className="mt-4 text-sm text-slate-400">
                Carregando notas B3...
              </p>
            )}

            {erroB3 && <p className="mt-4 text-sm text-red-400">{erroB3}</p>}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <CardResumo
                titulo="Notas salvas"
                valor={String(resumoB3.quantidade)}
              />
              <CardResumo
                titulo="Líquido acumulado"
                valor={`${
                  resumoB3.totalLiquido < 0 ? "-" : ""
                }${formatarMoeda(Math.abs(resumoB3.totalLiquido))}`}
                destaque={
                  resumoB3.totalLiquido < 0 ? "negativo" : "positivo"
                }
              />
              <CardResumo
                titulo="Custos acumulados"
                valor={formatarMoeda(resumoB3.totalCustos)}
                destaque="negativo"
              />
              <CardResumo
                titulo="IRRF acumulado"
                valor={formatarMoeda(resumoB3.totalIrrf)}
                destaque="alerta"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold md:text-2xl">
                  Resumo Geral Forex
                </h2>
                <p className="mt-1 text-sm text-slate-300 md:text-base">
                  Acumulado dos relatórios Forex do usuário logado.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportarBackup}
                  disabled={notasForex.length === 0}
                  className="h-10 rounded-lg border-slate-600 bg-transparent px-4 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar backup
                </Button>
              </div>
            </div>

            {carregandoForex && (
              <p className="mt-4 text-sm text-slate-400">
                Carregando relatórios Forex...
              </p>
            )}

            {erroForex && (
              <p className="mt-4 text-sm text-red-400">{erroForex}</p>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <CardResumo
                titulo="Relatórios salvos"
                valor={String(resumoForex.quantidade)}
              />
              <CardResumo
                titulo="Resultado acumulado (USD)"
                valor={formatarNumeroUsd(resumoForex.totalResultadoUsd)}
                destaque={
                  resumoForex.totalResultadoUsd < 0 ? "negativo" : "positivo"
                }
              />
              <CardResumo
                titulo="Depósito / Retirada acumulado (USD)"
                valor={formatarNumeroUsd(
                  resumoForex.totalDepositoRetiradaUsd
                )}
                destaque={
                  resumoForex.totalDepositoRetiradaUsd < 0
                    ? "negativo"
                    : resumoForex.totalDepositoRetiradaUsd > 0
                    ? "positivo"
                    : "normal"
                }
              />
              <CardResumo
                titulo="Último saldo final (USD)"
                valor={formatarNumeroUsd(resumoForex.ultimoSaldoUsd)}
              />
            </div>

            {!carregandoForex && resumosMensaisForex.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Fechamentos mensais</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {resumosMensaisForex.map((resumo) => (
                    <div
                      key={resumo.mes}
                      className="rounded-[16px] bg-[#0c1d45] p-4"
                    >
                      <p className="text-sm text-slate-300">{resumo.mes}</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatarNumeroUsd(resumo.resultadoMesUSD)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}