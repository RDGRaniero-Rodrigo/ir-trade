"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listarNotasB3,
  listarNotasForex,
  type NotaB3Banco,
  type NotaForexBanco,
} from "@/lib/supabase/notas";
import { Button } from "@/components/ui/button";
import {
  calcularFechamentosMensaisForex,
  type ResumoMensalForex,
} from "@/lib/calculo-forex";

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

function round2(valor: number) {
  return Number(valor.toFixed(2));
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarUsd(valor: number) {
  return valor.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
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

function mapNotaB3BancoParaLocal(nota: NotaB3Banco): NotaSalva {
  return {
    id: nota.id,
    numeroNota: nota.numero_nota ?? "",
    dataPregao: nota.data_pregao ?? "",
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

export default function DashboardPage() {
  const [mercadoSelecionado, setMercadoSelecionado] = useState<MercadoSelecionado>("b3");
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [notasForex, setNotasForex] = useState<NotaForexSalva[]>([]);
  const [resumosMensaisForex, setResumosMensaisForex] = useState<ResumoMensalForex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [b3, forex] = await Promise.all([
          listarNotasB3(),
          listarNotasForex(),
        ]);

        setNotasB3(b3.map(mapNotaB3BancoParaLocal));
        setNotasForex(forex.map(mapNotaForexBancoParaLocal));

        // Calcula resumos mensais Forex
        const relatorios = forex.map((nota) => ({
          id: nota.id,
          data: normalizarDataForexParaCalculo(nota.data_relatorio ?? ""),
          saldoInicial: Number(nota.saldo_inicial_usd ?? 0),
          resultadoDia: Number(nota.resultado_dia_usd ?? 0),
          depositoRetirada: Number(nota.deposito_retirada_usd ?? 0),
          saldoFinal: Number(nota.saldo_final_usd ?? 0),
        }));

        const resumos = await calcularFechamentosMensaisForex(relatorios);
        setResumosMensaisForex(resumos);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const resumoB3 = useMemo(() => {
    const totalLiquido = notasB3.reduce((acc, nota) => {
      return (
        acc + (nota.sinalLiquido === "D" ? -nota.valorLiquido : nota.valorLiquido)
      );
    }, 0);

    const totalIrrf = notasB3.reduce((acc, nota) => acc + nota.irrf, 0);

    return {
      quantidade: notasB3.length,
      totalLiquido: round2(totalLiquido),
      totalIrrf: round2(totalIrrf),
    };
  }, [notasB3]);

  const resumoForex = useMemo(() => {
    const totalResultado = notasForex.reduce(
      (acc, nota) => acc + nota.resultadoDiaUsd,
      0
    );
    const ultimoSaldo =
      notasForex.length > 0 ? notasForex[notasForex.length - 1].saldoFinalUsd : 0;

    return {
      quantidade: notasForex.length,
      totalResultado: round2(totalResultado),
      saldoAtual: round2(ultimoSaldo),
    };
  }, [notasForex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-slate-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Seletor de Mercado */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMercadoSelecionado("b3")}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            mercadoSelecionado === "b3"
              ? "bg-emerald-500 text-white"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#142952]"
          }`}
        >
          📈 Notas B3
        </button>
        <button
          onClick={() => setMercadoSelecionado("forex")}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            mercadoSelecionado === "forex"
              ? "bg-emerald-500 text-white"
              : "bg-[#0c1d45] text-slate-300 hover:bg-[#142952]"
          }`}
        >
          💱 Notas Forex
        </button>
      </div>

      {/* Dashboard B3 */}
      {mercadoSelecionado === "b3" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <CardResumo
              titulo="Total de Notas B3"
              valor={String(resumoB3.quantidade)}
            />
            <CardResumo
              titulo="Resultado Líquido"
              valor={formatarMoeda(resumoB3.totalLiquido)}
              destaque={resumoB3.totalLiquido < 0 ? "negativo" : "positivo"}
            />
            <CardResumo
              titulo="IRRF Retido"
              valor={formatarMoeda(resumoB3.totalIrrf)}
              destaque="alerta"
            />
          </div>

          <div className="flex gap-4">
            <Link href="/dashboard/upload">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                📄 Importar PDF (B3)
              </Button>
            </Link>
            <Link href="/dashboard/notas">

<Button className="bg-[#0c1d45] hover:bg-[#142952] text-white border border-slate-600">
  Ver Notas B3
</Button>

            </Link>
          </div>
        </>
      )}

      {/* Dashboard Forex */}
      {mercadoSelecionado === "forex" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <CardResumo
              titulo="Total de Relatórios"
              valor={String(resumoForex.quantidade)}
            />
            <CardResumo
              titulo="Resultado Total (USD)"
              valor={formatarUsd(resumoForex.totalResultado)}
              destaque={resumoForex.totalResultado < 0 ? "negativo" : "positivo"}
            />
            <CardResumo
              titulo="Saldo Atual (USD)"
              valor={formatarUsd(resumoForex.saldoAtual)}
            />
          </div>

          {/* Resumo Mensal Forex */}
          {resumosMensaisForex.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Fechamento Mensal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {resumosMensaisForex.slice(-6).map((resumo) => (
                  <div
                    key={resumo.mes}
                    className="rounded-xl bg-[#0c1d45] p-4 flex justify-between items-center"
                  >
                    <span className="text-slate-300">{resumo.mes}</span>
                    <span
                      className={`font-semibold ${
                        resumo.resultadoMesUSD >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatarUsd(resumo.resultadoMesUSD)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Link href="/dashboard/upload-forex">
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                📧 Importar Email (Forex)
              </Button>
            </Link>
            <Link href="/dashboard/notas-forex">
              <Button className="bg-[#0c1d45] hover:bg-[#142952] text-white border border-slate-600">
  Ver Relatórios Forex
</Button>

            </Link>
          </div>
        </>
      )}
    </div>
  );
}
