'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { historicoMensalMock } from '@/lib/mock-data';

export function GraficoMensal() {
  return (
    <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
      <h3 className="text-lg font-semibold text-white mb-6">
        Resultado Mensal
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={historicoMensalMock}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

            <XAxis dataKey="mes" stroke="#94a3b8" />

            <YAxis
              stroke="#94a3b8"
              tickFormatter={(value) => `R$ ${value}`}
            />

            <Tooltip />

            <Bar dataKey="resultadoLiquido">
              {historicoMensalMock.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.resultadoLiquido >= 0
                      ? '#22c55e'
                      : '#ef4444'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}