import { FileText, Calculator, PieChart, Lock } from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Upload Simples',
    description: 'Envie o PDF da nota de corretagem direto da XP. O sistema extrai os dados automaticamente.',
  },
  {
    icon: Calculator,
    title: 'Cálculo Automático',
    description: 'IRRF, DARF projetada, lucro líquido. Tudo calculado seguindo a legislação vigente.',
  },
  {
    icon: PieChart,
    title: 'Visão Completa',
    description: 'Acompanhe resultados diários, mensais e anuais em um dashboard intuitivo.',
  },
  {
    icon: Lock,
    title: 'Evita Duplicidade',
    description: 'O sistema identifica automaticamente notas ja importadas evitando duplicidade.',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo que você precisa para{' '}
            <span className="text-emerald-400">controlar seu IR</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Focado em day trade de mini contratos na XP Investimentos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}