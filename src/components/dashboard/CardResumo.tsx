import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CardResumoProps {
  titulo: string;
  valor: number;
  icone: LucideIcon;
  formato?: 'moeda' | 'percentual';
  corValor?: 'auto' | 'verde' | 'vermelho' | 'amarelo' | 'neutro';
  descricao?: string;
}

export function CardResumo({
  titulo,
  valor,
  icone: Icone,
  formato = 'moeda',
  corValor = 'auto',
  descricao,
}: CardResumoProps) {
  const formatarValor = (val: number) => {
    if (formato === 'percentual') {
      return `${val.toFixed(2)}%`;
    }
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getCorValor = () => {
    if (corValor === 'verde') return 'text-emerald-400';
    if (corValor === 'vermelho') return 'text-red-400';
    if (corValor === 'amarelo') return 'text-yellow-400';
    if (corValor === 'neutro') return 'text-slate-300';
    return valor >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  return (
    <div className={cn('p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300')}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
          <Icone className={cn('h-6 w-6', getCorValor())} />
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-1">{titulo}</p>
      <p className={cn('text-2xl font-bold', getCorValor())}>
        {formatarValor(valor)}
      </p>

      {descricao && (
        <p className="text-slate-500 text-xs mt-2">{descricao}</p>
      )}
    </div>
  );
}