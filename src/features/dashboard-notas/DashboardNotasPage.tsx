"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  listarNotasB3,
  listarNotasForex,
  excluirNotaB3,
  excluirNotaForex,
} from "@/lib/supabase/notas";

type MercadoSelecionado = "b3" | "forex";

export default function DashboardNotasPage() {
  const [mercadoSelecionado, setMercadoSelecionado] =
    useState<MercadoSelecionado>("b3");

  const [notasSalvas, setNotasSalvas] = useState<any[]>([]);
  const [notasForexSalvas, setNotasForexSalvas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);

        const [b3, forex] = await Promise.all([
          listarNotasB3(),
          listarNotasForex(),
        ]);

        setNotasSalvas(b3);
        setNotasForexSalvas(forex);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  async function confirmarExclusaoB3(id: string) {
    if (!confirm("Deseja realmente excluir essa nota?")) return;

    await excluirNotaB3(id);
    const atualizadas = await listarNotasB3();
    setNotasSalvas(atualizadas);
  }

  async function confirmarExclusaoForex(id: string) {
    if (!confirm("Deseja realmente excluir esse relatório?")) return;

    await excluirNotaForex(id);
    const atualizadas = await listarNotasForex();
    setNotasForexSalvas(atualizadas);
  }

  return (
    <div className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* 🔹 SELETOR DE MERCADO */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setMercadoSelecionado("b3")}
            variant={mercadoSelecionado === "b3" ? "default" : "outline"}
          >
            B3
          </Button>

          <Button
            onClick={() => setMercadoSelecionado("forex")}
            variant={mercadoSelecionado === "forex" ? "default" : "outline"}
          >
            Forex
          </Button>
        </div>

        {erro && <div className="mb-4 text-red-400 text-sm">{erro}</div>}

        {/* 🔹 B3 */}
        {mercadoSelecionado === "b3" && (
          <div>
            <h2 className="text-xl mb-4">Notas B3</h2>

            {carregando ? (
              <p>Carregando...</p>
            ) : notasSalvas.length === 0 ? (
              <p className="text-slate-400">
                Nenhuma nota encontrada.
              </p>
            ) : (
              notasSalvas.map((nota) => (
                <div
                  key={nota.id}
                  className="mb-3 p-3 bg-[#061538] rounded flex justify-between items-center"
                >
                  <div>
                    <p>{nota.numero_nota}</p>
                    <p className="text-xs text-gray-400">
                      {nota.cliente}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={() => confirmarExclusaoB3(nota.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 🔹 FOREX */}
        {mercadoSelecionado === "forex" && (
          <div>
            <h2 className="text-xl mb-4">Relatórios Forex</h2>

            {carregando ? (
              <p>Carregando...</p>
            ) : notasForexSalvas.length === 0 ? (
              <p className="text-slate-400">
                Nenhum relatório encontrado.
              </p>
            ) : (
              notasForexSalvas.map((nota) => (
                <div
                  key={nota.id}
                  className="mb-3 p-3 bg-[#061538] rounded flex justify-between items-center"
                >
                  <div>
                    <p>{nota.conta}</p>
                    <p className="text-xs text-gray-400">
                      {nota.cliente}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={() => confirmarExclusaoForex(nota.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}