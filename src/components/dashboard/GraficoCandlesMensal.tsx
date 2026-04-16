'use client';

import { useMemo } from 'react';

type NotaSalva = {
  dataPregao: string;
  valorLiquido: number;
  sinalLiquido: 'C' | 'D' | null;
};

interface GraficoCandlesMensalProps {
  notas: NotaSalva[];
  mesSelecionado: { ano: number; mes: number } | null;
}

type CandleDia = {
  dia: number;
  valor: number;
};

function parseDataPregao(data: string): { dia: number; mes: number; ano: number } | null {
  const partes = data.split('/');
  if (partes.length !== 3) return null;
  return {
    dia: Number(partes[0]),
    mes: Number(partes[1]),
    ano: Number(partes[2]),
  };
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GraficoCandlesMensal({ notas, mesSelecionado }: GraficoCandlesMensalProps) {
  const candles = useMemo<CandleDia[]>(() => {
    if (!mesSelecionado) return [];

    const mapa = new Map<number, number>();

    for (const nota of notas) {
      const parsed = parseDataPregao(nota.dataPregao);
      if (!parsed) continue;
      if (parsed.mes !== mesSelecionado.mes || parsed.ano !== mesSelecionado.ano) continue;

      const valor = nota.sinalLiquido === 'D' ? -nota.valorLiquido : nota.valorLiquido;
      mapa.set(parsed.dia, (mapa.get(parsed.dia) ?? 0) + valor);
    }

    return Array.from(mapa.entries())
      .map(([dia, valor]) => ({ dia, valor: Number(valor.toFixed(2)) }))
      .sort((a, b) => a.dia - b.dia);
  }, [notas, mesSelecionado]);

  if (candles.length === 0) return null;

  const maxAbsoluto = Math.max(...candles.map((c) => Math.abs(c.valor)));
  const ALTURA_MAX = 100;
  const LARGURA_CANDLE = 32;

  return (
    <div className="mt-4 rounded-[16px] border border-slate-700 bg-[#081733] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Resultado por Dia</p>
          <p className="text-xs text-slate-500">Cada barra = 1 dia com nota importada</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span className="text-xs text-slate-400">Positivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span className="text-xs text-slate-400">Negativo</span>
          </div>
        </div>
      </div>

      {/* Área do gráfico */}
      <div className="relative overflow-x-auto">
        <div
          className="flex items-center gap-1.5 px-1"
          style={{ minHeight: ALTURA_MAX * 2 + 28, minWidth: candles.length * (LARGURA_CANDLE + 6) }}
        >
          {candles.map((candle) => {
            const alturaPixel =
              maxAbsoluto > 0
                ? Math.max(6, Math.round((Math.abs(candle.valor) / maxAbsoluto) * ALTURA_MAX))
                : 6;

            const positivo = candle.valor >= 0;

            return (
              <div
                key={candle.dia}
                className="group relative flex flex-shrink-0 flex-col items-center"
                style={{ width: LARGURA_CANDLE }}
              >
                {/* Tooltip */}
                <div className="pointer-events-none absolute z-20 hidden -translate-x-1/2 rounded-lg border border-slate-600 bg-[#0c1d45] px-3 py-2 text-center shadow-xl group-hover:block"
                  style={{
                    bottom: ALTURA_MAX * 2 + 36,
                    left: '50%',
                  }}
                >
                  <p className="whitespace-nowrap text-xs font-semibold text-slate-200">
                    Dia {String(candle.dia).padStart(2, '0')}
                  </p>
                  <p
                    className={`whitespace-nowrap text-xs font-bold ${
                      positivo ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatarMoeda(candle.valor)}
                  </p>
                </div>

                {/* Parte superior — candles positivos crescem para cima */}
                <div
                  className="flex w-full items-end justify-center"
                  style={{ height: ALTURA_MAX }}
                >
                  {positivo && (
                    <div
                      className="w-5 cursor-pointer rounded-t-md bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] transition-all duration-200 group-hover:bg-emerald-400 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      style={{ height: alturaPixel }}
                    />
                  )}
                </div>

                {/* Linha central (zero) */}
                <div className="h-px w-full bg-slate-600" />

                {/* Parte inferior — candles negativos crescem para baixo */}
                <div
                  className="flex w-full items-start justify-center"
                  style={{ height: ALTURA_MAX }}
                >
                  {!positivo && (
                    <div
                      className="w-5 cursor-pointer rounded-b-md bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)] transition-all duration-200 group-hover:bg-red-400 group-hover:shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                      style={{ height: alturaPixel }}
                    />
                  )}
                </div>

                {/* Label do dia */}
                <span className="mt-1 text-[10px] font-medium text-slate-500">
                  {String(candle.dia).padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Linha de zero label */}
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-slate-600/60"
          style={{ top: ALTURA_MAX + 1 }}
        />
      </div>

      {/* Rodapé */}
      <div className="mt-2 flex items-center justify-end border-t border-slate-700/40 pt-2">
        <span className="text-xs text-slate-500">
          {candles.length} dia{candles.length !== 1 ? 's' : ''} com operação no mês
        </span>
      </div>
    </div>
  );
}
