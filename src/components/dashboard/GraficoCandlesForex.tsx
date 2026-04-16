// components/dashboard/GraficoCandlesForex.tsx
"use client";

import { useMemo } from "react";
import { RelatorioForex } from "@/lib/calculo-forex";

type Props = {
  relatorios: RelatorioForex[];
  mesSelecionado: { ano: number; mes: number };
};

type CandleDia = {
  dia: string;
  resultado: number;
  positivo: boolean;
};

function normalizarData(data: string): string {
  if (!data) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(data.trim())) return data.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data.trim())) {
    const [dia, mes, ano] = data.trim().split("/");
    return `${ano}-${mes}-${dia}`;
  }
  return "";
}

export function GraficoCandlesForex({ relatorios, mesSelecionado }: Props) {
  const candles = useMemo<CandleDia[]>(() => {
    const { ano, mes } = mesSelecionado;
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;

    return relatorios
      .map((r) => ({ ...r, data: normalizarData(r.data || "") }))
      .filter((r) => r.data.startsWith(chave))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((r) => ({
        dia: r.data.slice(8, 10),
        resultado: r.resultadoDia ?? 0,
        positivo: (r.resultadoDia ?? 0) >= 0,
      }));
  }, [relatorios, mesSelecionado]);

  if (candles.length === 0) return null;

  const maxAbs = Math.max(...candles.map((c) => Math.abs(c.resultado)), 1);

  return (
    <div className="rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-200">Resultado por Dia</p>
          <p className="text-[10px] text-slate-500">
            Cada barra = 1 dia com relatório importado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" />
            Positivo
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-400" />
            Negativo
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div
        className="flex items-end justify-start gap-1.5 overflow-x-auto pb-1"
        style={{ height: 100 }}
      >
        {candles.map((c) => {
          const altura = Math.max(4, (Math.abs(c.resultado) / maxAbs) * 90);
          return (
            <div key={c.dia} className="group flex flex-col items-center gap-0.5">
              {/* Tooltip */}
              <div className="relative">
                <div className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-white group-hover:block">
                  $ {c.resultado.toFixed(2)}
                </div>
              </div>

              {/* Barra */}
              <div
                className={`w-5 rounded-sm transition-all ${
                  c.positivo ? "bg-emerald-400" : "bg-red-400"
                }`}
                style={{ height: altura }}
              />

              {/* Dia */}
              <span className="text-[9px] text-slate-500">{c.dia}</span>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <p className="mt-1 text-right text-[9px] text-slate-600">
        {candles.length} dia(s) com operação no mês
      </p>
    </div>
  );
}
