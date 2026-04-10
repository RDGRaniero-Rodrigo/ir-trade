'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center gradient-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 text-sm font-medium">MVP - Corretora XP</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Controle seu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Day Trade
          </span>
          <br />
          Calcule seu IR
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Envie suas notas de corretagem da XP e visualize automaticamente seus resultados,
          IRRF retido e DARF projetada. Simples assim.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/login">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg">
            Ver Demonstração
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span>Índice (WIN), Dólar (WDO), Bitcoin (BIT)</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Dados seguros</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <Zap className="h-5 w-5 text-emerald-400" />
            <span>Cálculo automático</span>
          </div>
        </div>
      </div>
    </section>
  );
}