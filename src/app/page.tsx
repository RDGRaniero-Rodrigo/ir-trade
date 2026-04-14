"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [usuarioLogado, setUsuarioLogado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    async function verificarSessao() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        setUsuarioLogado(!!data.session);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setUsuarioLogado(false);
      } finally {
        setVerificando(false);
      }
    }
    verificarSessao();
  }, []);

  return (
    <main className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          RDG NeuraTech
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
          IR Trade
        </h1>

        <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-xl">
          Plataforma para importação de notas, cálculo de imposto e organização
          das operações.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {!verificando && !usuarioLogado && (
            <Link
              href="/login"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Entrar
            </Link>
          )}

          {!verificando && usuarioLogado && (
            <Link
              href="/dashboard"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Ir para dashboard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
