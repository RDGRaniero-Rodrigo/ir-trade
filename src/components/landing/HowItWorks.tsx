import { Upload, Cpu, BarChart3 } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Upload,
    title: 'Envie a Nota',
    description: 'Faça upload do PDF da nota de corretagem da XP',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'Processamento',
    description: 'O sistema extrai e calcula todos os dados automaticamente',
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'Visualize',
    description: 'Acompanhe resultados, IRRF e DARF em tempo real',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 gradient-bg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Como funciona
          </h2>
          <p className="text-slate-400 text-lg">
            Em 3 passos simples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-emerald-500/50 to-transparent" />
              )}

              <div className="text-center">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                    <item.icon className="h-10 w-10 text-emerald-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}