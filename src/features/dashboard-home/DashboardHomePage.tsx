"use client";

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
import DashboardUploadPage from "@/features/dashboard-upload/DashboardUploadPage";
import {
  Upload,
  Receipt,
  TrendingUp,
  TrendingDown,
  FileText,
  BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MercadoSelecionado = "b3" | "forex";
type AbaUpload = "importar" | "mensal" | "anual" | "notas";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(valor: number) {
  return Number(valor.toFixed(2));
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizarDataForexParaCalculo(dataRelatorio: string) {
  const match = dataRelatorio.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
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

// ─── Card de Ação Rápida ──────────────────────────────────────────────────────

function CardAcao({
  icon: Icon,
  label,
  descricao,
  ativo,
  cor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  descricao: string;
  ativo: boolean;
  cor: "emerald" | "violet" | "cyan" | "blue";
  onClick: () => void;
}) {
  const cores = {
    emerald: {
      bg: ativo ? "bg-emerald-500/15 border-emerald-500/50" : "bg-[#061538] border-slate-800 hover:border-emerald-500/40",
      icon: "text-emerald-400 bg-emerald-500/10",
      label: ativo ? "text-emerald-400" : "text-white",
    },
    violet: {
      bg: ativo ? "bg-violet-500/15 border-violet-500/50" : "bg-[#061538] border-slate-800 hover:border-violet-500/40",
      icon: "text-violet-400 bg-violet-500/10",
      label: ativo ? "text-violet-400" : "text-white",
    },
    cyan: {
      bg: ativo ? "bg-cyan-500/15 border-cyan-500/50" : "bg-[#061538] border-slate-800 hover:border-cyan-500/40",
      icon: "text-cyan-400 bg-cyan-500/10",
      label: ativo ? "text-cyan-400" : "text-white",
    },
    blue: {
      bg: ativo ? "bg-blue-500/15 border-blue-500/50" : "bg-[#061538] border-slate-800 hover:border-blue-500/40",
      icon: "text-blue-400 bg-blue-500/10",
      label: ativo ? "text-blue-400" : "text-white",
    },
  };

  const c = cores[cor];

  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-start gap-3 rounded-[16px] border p-4 text-left transition ${c.bg}`}
    >
      <div className={`rounded-lg p-2 ${c.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className={`text-sm font-semibold ${c.label}`}>{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">{descricao}</p>
      </div>
    </button>
  );
}

// ─── Card de Resumo ───────────────────────────────────────────────────────────

function CardResumo({
  titulo,
  valor,
  destaque = "normal",
  icone: Icone,
}: {
  titulo: string;
  valor: string;
  destaque?: "normal" | "positivo" | "negativo" | "alerta";
  icone?: React.ElementType;
}) {
  const cor =
    destaque === "positivo" ? "text-emerald-400"
    : destaque === "negativo" ? "text-red-400"
    : destaque === "alerta" ? "text-yellow-400"
    : "text-white";

  return (
    <div className="rounded-[16px] bg-[#0c1d45] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-300">{titulo}</p>
        {Icone && <Icone className={`h-4 w-4 ${cor} opacity-60`} />}
      </div>
      <p className={`mt-2 text-xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const [abaUpload, setAbaUpload] = useState<AbaUpload | null>(null);
  const [notasB3, setNotasB3] = useState<NotaSalva[]>([]);
  const [notasForex, setNotasForex] = useState<NotaForexSalva[]>([]);
  const [resumosMensaisForex, setResumosMensaisForex] = useState<ResumoMensalForex[]>([]);

  useEffect(() => {
    async function carregar() {
      try {
        const [b3, forex] = await Promise.all([listarNotasB3(), listarNotasForex()]);
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
      return acc + (nota.sinalLiquido === "D" ? -nota.valorLiquido : nota.valorLiquido);
    }, 0);
    return {
      quantidade: notasB3.length,
      totalLiquido: round2(totalLiquido),
    };
  }, [notasB3]);

  const resumoForex = useMemo(() => {
    const totalBrl = resumosMensaisForex.reduce((acc, r) => acc + r.resultadoConvertidoBRL, 0);
    return {
      quantidade: notasForex.length,
      totalBrl: round2(totalBrl),
    };
  }, [notasForex, resumosMensaisForex]);

  function abrirAba(aba: AbaUpload) {
    // Se clicar na mesma aba que está aberta, fecha o painel
    setAbaUpload((prev) => (prev === aba ? null : aba));
  }

  const painelAberto = abaUpload !== null;

  return (
    <div className="text-white">
      {/* ── Layout: 1 ou 2 colunas ── */}
      <div className={`flex gap-6 ${painelAberto ? "flex-col xl:flex-row" : "flex-col"}`}>

        {/* ── Coluna esquerda: resumo + ações ── */}
        <div className={painelAberto ? "xl:w-[320px] xl:flex-shrink-0" : "w-full"}>

          {/* Cabeçalho */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Visão Geral</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1>
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3">
            <CardResumo
              titulo="Notas B3"
              valor={String(resumoB3.quantidade)}
              icone={FileText}
            />
            <CardResumo
              titulo="Resultado B3"
              valor={formatarMoeda(resumoB3.totalLiquido)}
              destaque={resumoB3.totalLiquido < 0 ? "negativo" : "positivo"}
              icone={resumoB3.totalLiquido < 0 ? TrendingDown : TrendingUp}
            />
            <CardResumo
              titulo="Relatórios Forex"
              valor={String(resumoForex.quantidade)}
              icone={FileText}
            />
            <CardResumo
              titulo="Resultado Forex"
              valor={formatarMoeda(resumoForex.totalBrl)}
              destaque={resumoForex.totalBrl < 0 ? "negativo" : "positivo"}
              icone={resumoForex.totalBrl < 0 ? TrendingDown : TrendingUp}
            />
          </div>

          {/* Ações rápidas */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Ações rápidas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <CardAcao
                icon={Upload}
                label="Importar Nota"
                descricao="Envie um PDF ou EML"
                ativo={abaUpload === "importar"}
                cor="emerald"
                onClick={() => abrirAba("importar")}
              />
              <CardAcao
                icon={Receipt}
                label="Notas Salvas"
                descricao="Veja o histórico"
                ativo={abaUpload === "notas"}
                cor="violet"
                onClick={() => abrirAba("notas")}
              />
              <CardAcao
                icon={BarChart2}
                label="Resumo Mensal"
                descricao="Fechamento e DARF"
                ativo={abaUpload === "mensal"}
                cor="cyan"
                onClick={() => abrirAba("mensal")}
              />
              <CardAcao
                icon={TrendingUp}
                label="Resumo Anual"
                descricao="Consolidado do ano"
                ativo={abaUpload === "anual"}
                cor="blue"
                onClick={() => abrirAba("anual")}
              />
            </div>
          </div>
        </div>

        {/* ── Coluna direita: painel dinâmico ── */}
        {painelAberto && (
          <div className="min-w-0 flex-1">
            <DashboardUploadPage abaInicial={abaUpload!} />
          </div>
        )}
      </div>
    </div>
  );
}
