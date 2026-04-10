"use client";

import { useEffect, useState } from "react";
import { Globe2, CheckCircle2, Settings2 } from "lucide-react";

type Mercado = "b3" | "forex";

type ConfiguracaoMercado = {
  mercado: Mercado;
};

const STORAGE_KEY_CONFIG = "irtrade_configuracoes_corretora";

const MERCADOS = [
  {
    id: "b3" as Mercado,
    nome: "Brasil / B3",
    descricao: "Notas de corretagem do mercado brasileiro.",
    disponivel: true,
  },
  {
    id: "forex" as Mercado,
    nome: "Forex / Internacional",
    descricao: "Corretoras internacionais e mercado Forex.",
    disponivel: false,
  },
];

function carregarConfiguracao(): ConfiguracaoMercado {
  if (typeof window === "undefined") {
    return { mercado: "b3" };
  }

  try {
    const bruto = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!bruto) {
      return { mercado: "b3" };
    }

    const parsed = JSON.parse(bruto);

    if (parsed && (parsed.mercado === "b3" || parsed.mercado === "forex")) {
      return { mercado: parsed.mercado };
    }

    return { mercado: "b3" };
  } catch {
    return { mercado: "b3" };
  }
}

function salvarConfiguracao(config: ConfiguracaoMercado) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

function CardOpcao({
  ativo,
  titulo,
  descricao,
  onClick,
}: {
  ativo: boolean;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[18px] border p-4 text-left transition ${
        ativo
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-slate-800 bg-[#061538] hover:bg-[#0a1a42]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{titulo}</p>
          <p className="mt-1 text-sm text-slate-300">{descricao}</p>
        </div>

        {ativo && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
      </div>
    </button>
  );
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfiguracaoMercado>({
    mercado: "b3",
  });

  useEffect(() => {
    setConfig(carregarConfiguracao());
  }, []);

  const mercadoAtualInfo =
    MERCADOS.find((item) => item.id === config.mercado) ?? null;

  function handleSelecionarMercado(mercado: Mercado) {
    const novaConfig = { mercado };
    setConfig(novaConfig);
    salvarConfiguracao(novaConfig);
  }

  return (
    <div className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-7">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Configurações
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Escolha o mercado
          </h1>
          <p className="mt-1 text-sm text-slate-300 md:text-base">
            Defina qual mercado o app deve usar como referência principal de leitura.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-300">
                <Globe2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Mercado</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Selecione o tipo de mercado que o app deve usar.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {MERCADOS.map((mercado) => (
                <CardOpcao
                  key={mercado.id}
                  ativo={config.mercado === mercado.id}
                  titulo={mercado.nome}
                  descricao={mercado.descricao}
                  onClick={() => handleSelecionarMercado(mercado.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Configuração atual</h2>
              <p className="mt-1 text-sm text-slate-300">
                Esta será a referência principal para o uso do app.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[16px] bg-[#0c1d45] p-4">
              <p className="text-xs text-slate-300 md:text-sm">Mercado</p>
              <p className="mt-2 text-lg font-semibold md:text-xl text-white">
                {config.mercado === "b3" ? "Brasil / B3" : "Forex / Internacional"}
              </p>
            </div>

            <div className="rounded-[16px] bg-[#0c1d45] p-4">
              <p className="text-xs text-slate-300 md:text-sm">Status da leitura</p>
              <p
                className={`mt-2 text-lg font-semibold md:text-xl ${
                  mercadoAtualInfo?.disponivel
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {mercadoAtualInfo?.disponivel ? "Disponível" : "Em desenvolvimento"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-slate-700 bg-[#081733] p-4">
            <p className="text-sm text-slate-300">
              No momento, a leitura automatizada está preparada para o mercado{" "}
              <span className="font-semibold text-white">Brasil / B3</span>. O módulo{" "}
              <span className="font-semibold text-white">Forex / Internacional</span>{" "}
              será ativado conforme os próximos parsers forem adicionados ao app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}