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

function parseDataPregao(data: string) {
  const partes = data.split('/');
  if (partes.length !== 3) return null;
  return { dia: Number(partes[0]), mes: Number(partes[1]), ano: Number(partes[2]) };
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

  // ✅ Altura reduzida para caber na tela
  const ALTURA_MAX = 50;
  const LARGURA_CANDLE = 24;
  const CORPO_W = 12;
  const WICK_W = 2;

  return (
    <div className="rounded-[12px] border border-slate-700/60 bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
        <div>
          <p className="text-xs font-semibold text-slate-200">Resultado por Dia</p>
          <p className="text-[10px] text-slate-500">Cada candle = 1 dia com nota importada</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-[#26a69a]" />
            <span className="text-[10px] text-slate-400">Positivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-[#ef5350]" />
            <span className="text-[10px] text-slate-400">Negativo</span>
          </div>
        </div>
      </div>

      {/* Área do gráfico */}
      <div className="relative overflow-x-auto px-3 py-2" style={{ background: '#161b22' }}>

        {/* Linhas de grade */}
        <div
          className="absolute inset-x-3 pointer-events-none"
          style={{ top: 8, height: ALTURA_MAX * 2 }}
        >
          {[0, 0.5, 1].map((frac) => (
            <div
              key={frac}
              className="absolute left-0 right-0 border-t border-slate-700/25"
              style={{ top: `${frac * 100}%` }}
            />
          ))}
        </div>

        <div
          className="relative flex items-end gap-0.5"
          style={{
            height: ALTURA_MAX * 2 + 18,
            minWidth: candles.length * (LARGURA_CANDLE + 2),
          }}
        >
          {candles.map((candle) => {
            const positivo = candle.valor >= 0;
            const alturaCorpo =
              maxAbsoluto > 0
                ? Math.max(3, Math.round((Math.abs(candle.valor) / maxAbsoluto) * ALTURA_MAX))
                : 3;
            const alturaWick = Math.min(alturaCorpo * 0.25, 6);

            const corCorpo = positivo ? '#26a69a' : '#ef5350';
            const corWick = positivo ? '#1a7a75' : '#b03030';
            const centroY = ALTURA_MAX;

            return (
              <div
                key={candle.dia}
                className="group relative flex-shrink-0 flex flex-col items-center cursor-pointer"
                style={{ width: LARGURA_CANDLE, height: ALTURA_MAX * 2 + 18 }}
              >
                {/* Tooltip */}
                <div
                  className="pointer-events-none absolute z-30 hidden group-hover:flex flex-col items-center rounded-lg border border-slate-600 bg-[#1e2530] px-2 py-1.5 shadow-xl"
                  style={{
                    bottom: ALTURA_MAX * 2 + 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <p className="whitespace-nowrap text-[10px] font-semibold text-slate-300">
                    Dia {String(candle.dia).padStart(2, '0')}
                  </p>
                  <p className={`whitespace-nowrap text-[10px] font-bold ${positivo ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                    {formatarMoeda(candle.valor)}
                  </p>
                </div>

                {/* SVG Candle */}
                <svg
                  width={LARGURA_CANDLE}
                  height={ALTURA_MAX * 2}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                  overflow="visible"
                >
                  {positivo ? (
                    <>
                      <rect
                        x={(LARGURA_CANDLE - WICK_W) / 2}
                        y={centroY - alturaCorpo - alturaWick}
                        width={WICK_W}
                        height={alturaWick}
                        fill={corWick}
                        rx={1}
                      />
                      <rect
                        x={(LARGURA_CANDLE - CORPO_W) / 2}
                        y={centroY - alturaCorpo}
                        width={CORPO_W}
                        height={alturaCorpo}
                        fill={corCorpo}
                        rx={2}
                        className="transition-opacity duration-150 group-hover:opacity-75"
                      />
                    </>
                  ) : (
                    <>
                      <rect
                        x={(LARGURA_CANDLE - CORPO_W) / 2}
                        y={centroY}
                        width={CORPO_W}
                        height={alturaCorpo}
                        fill={corCorpo}
                        rx={2}
                        className="transition-opacity duration-150 group-hover:opacity-75"
                      />
                      <rect
                        x={(LARGURA_CANDLE - WICK_W) / 2}
                        y={centroY + alturaCorpo}
                        width={WICK_W}
                        height={alturaWick}
                        fill={corWick}
                        rx={1}
                      />
                    </>
                  )}
                  {/* Linha do zero */}
                  <line
                    x1={0}
                    y1={centroY}
                    x2={LARGURA_CANDLE}
                    y2={centroY}
                    stroke="#334155"
                    strokeWidth={1}
                  />
                </svg>

                {/* Label dia */}
                <span
                  className="absolute text-[9px] font-medium text-slate-600"
                  style={{ bottom: 1 }}
                >
                  {String(candle.dia).padStart(2, '0')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end border-t border-slate-700/30 px-3 py-1">
        <span className="text-[10px] text-slate-600">
          {candles.length} dia{candles.length !== 1 ? 's' : ''} com operação no mês
        </span>
      </div>
    </div>
  );
}
