"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [status, setStatus] = useState("Testando conexão...");

  useEffect(() => {
    async function testar() {
      try {
        const { error } = await supabase.auth.getSession();

        if (error) {
          setStatus(`Erro na conexão: ${error.message}`);
          return;
        }

        setStatus("Conexão com Supabase OK");
      } catch (err) {
        setStatus("Erro inesperado ao conectar com Supabase");
      }
    }

    testar();
  }, []);

  return (
    <main className="min-h-screen bg-[#020b24] text-white flex items-center justify-center p-6">
      <div className="rounded-2xl border border-slate-700 bg-[#061538] p-8 max-w-xl w-full text-center">
        <h1 className="text-3xl font-bold">IR Trade</h1>
        <p className="mt-4 text-slate-300">{status}</p>
      </div>
    </main>
  );
}