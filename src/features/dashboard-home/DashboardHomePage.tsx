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

export default function DashboardHomePage() {
  const [mercadoSelecionado, setMercadoSelecionado] =
    useState<MercadoSelecionado>("b3");
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [notasForex, setNotasForex] = useState<NotaForexSalva[]>([]);
  const [resumosMensaisForex, setResumosMensaisForex] = useState<
    ResumoMensalForex[]
  >([]);

  useEffect(() => {
    async function carregar() {
      try {
        const [b3, forex] = await Promise.all([
          listarNotasB3(),
          listarNotasForex(),
        ]);

        setNotasB3(b3.map(mapNotaB3BancoParaLocal));
        setNotasForex(forex.map(mapNotaForexBancoParaLocal));

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

    return {
      quantidade: notasB3.length,
      totalLiquido: round2(totalLiquido),
    };
  }, [notasB3]);

  return (
    <div className="min-h-screen bg-[#020b24] text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <CardResumo
          titulo="Notas B3"
          valor={String(resumoB3.quantidade)}
        />
        <CardResumo
          titulo="Resultado"
          valor={formatarMoeda(resumoB3.totalLiquido)}
          destaque={resumoB3.totalLiquido < 0 ? "negativo" : "positivo"}
        />
      </div>

      <div className="mt-6">
        <Link href="/dashboard/upload">
          <Button>Importar Nota</Button>
        </Link>
      </div>
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