'use client';

import { Badge } from '@/components/ui/badge';
import { notasMock } from '@/lib/mock-data';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TabelaNotasProps {
  limite?: number;
  mostrarVerTodas?: boolean;
}

export function TabelaNotas({ limite, mostrarVerTodas = true }: TabelaNotasProps) {
  const notas = limite ? notasMock.slice(0, limite) : notasMock;

  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Últimas Notas</h3>
        {mostrarVerTodas && (
          <Link href="/dashboard/notas">
            <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
              Ver todas
            </Button>
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left p-4 text-slate-400 font-medium text-sm">Data</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">Nota</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">Ativo</th>
              <th className="text-right p-4 text-slate-400 font-medium text-sm">Resultado</th>
              <th className="text-right p-4 text-slate-400 font-medium text-sm">IRRF</th>
              <th className="text-center p-4 text-slate-400 font-medium text-sm">Status</th>
              <th className="text-center p-4 text-slate-400 font-medium text-sm">Ação</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((nota) => (
              <tr
                key={nota.id}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="p-4 text-white">
                  {format(new Date(nota.dataPregao), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td className="p-4 text-slate-300">#{nota.numeroNota}</td>
                <td className="p-4">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400"
                  >
                    {nota.ativo}
                  </Badge>
                </td>
                <td className={`p-4 text-right font-medium ${
                  nota.resultadoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {nota.resultadoLiquido.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="p-4 text-right text-slate-300">
                  {nota.irrf.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="p-4 text-center">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
                    {nota.status}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}