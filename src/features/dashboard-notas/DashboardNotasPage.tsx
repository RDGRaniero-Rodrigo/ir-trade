"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  listarNotasB3,
  listarNotasForex,
  excluirNotaB3,
  excluirNotaForex,
  type NotaB3Banco,
  type NotaForexBanco,
} from "@/lib/supabase/notas";

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

function formatarDataForexParaExibicao(dataRelatorio: string) {
  const match = dataRelatorio.match(
    /^(\d{4})\.(\d{2})\.(\d{2})(?:\s+(\d{2}:\d{2}))?$/
  );

  if (!match) return dataRelatorio;

  const [_, ano, mes, dia, hora] = match;

  return hora ? `${dia}/${mes}/${ano} ${hora}` : `${dia}/${mes}/${ano}`;
}

function CardResumoValor({
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
      <p className="text-xs text-slate-300">{titulo}</p>
      <p className={`mt-2 text-lg font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

function mapNotaB3BancoParaLocal(nota: NotaB3Banco): NotaSalva {
  let dataPregao = "";

  if (nota.data_pregao) {
    const [ano, mes, dia] = nota.data_pregao.split("-");
    dataPregao = `${dia}/${mes}/${ano}`;
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

export default function DashboardNotasPage() {
  const [mercadoSelecionado, setMercadoSelecionado] =
    useState<MercadoSelecionado>("b3");
  const [notasSalvas, setNotasSalvas] = useState<NotaSalva[]>([]);
  const [notasForexSalvas, setNotasForexSalvas] = useState<NotaForexSalva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const [b3, forex] = await Promise.all([
          listarNotasB3(),
          listarNotasForex(),
        ]);

        setNotasSalvas(b3.map(mapNotaB3BancoParaLocal));
        setNotasForexSalvas(forex.map(mapNotaForexBancoParaLocal));
      } catch {
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  async function confirmarExclusaoB3(id: string) {
    if (!confirm("Deseja realmente excluir essa nota?")) return;

    await excluirNotaB3(id);
    const atualizadas = await listarNotasB3();
    setNotasSalvas(atualizadas.map(mapNotaB3BancoParaLocal));
  }

  async function confirmarExclusaoForex(id: string) {
    if (!confirm("Deseja realmente excluir esse relatório?")) return;

    await excluirNotaForex(id);
    const atualizadas = await listarNotasForex();
    setNotasForexSalvas(atualizadas.map(mapNotaForexBancoParaLocal));
  }

  return (
    <div className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6">
        {erro && (
          <div className="mb-4 text-red-400 text-sm">{erro}</div>
        )}

        {mercadoSelecionado === "b3" ? (
          <div>
            <h2 className="text-xl mb-4">Notas B3</h2>

            {carregando ? (
              <p>Carregando...</p>
            ) : notasSalvas.length === 0 ? (
              <p className="text-slate-400">
                Nenhuma nota encontrada. Faça o upload na aba de importação.
              </p>
            ) : (
              notasSalvas.map((nota) => (
                <div key={nota.id} className="mb-3 p-3 bg-[#061538] rounded">
                  <p>{nota.numeroNota}</p>
                  <Button onClick={() => confirmarExclusaoB3(nota.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl mb-4">Forex</h2>

            {carregando ? (
              <p>Carregando...</p>
            ) : notasForexSalvas.length === 0 ? (
              <p className="text-slate-400">
                Nenhum relatório encontrado. Faça o upload na aba de importação.
              </p>
            ) : (
              notasForexSalvas.map((nota) => (
                <div key={nota.id} className="mb-3 p-3 bg-[#061538] rounded">
                  <p>{nota.conta}</p>
                  <Button onClick={() => confirmarExclusaoForex(nota.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}