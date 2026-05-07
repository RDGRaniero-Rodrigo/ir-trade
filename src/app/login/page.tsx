"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"erro" | "sucesso">("erro");

  const handleLogin = async () => {
    if (!email || !senha) {
      setMensagem("Preencha email e senha");
      setTipoMensagem("erro");
      return;
    }

    setLoading(true);
    setMensagem("");

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Email ou senha incorretos");
      setTipoMensagem("erro");
      setLoading(false);
      return;
    }

    // ✅ Verifica se é primeiro acesso
    const userId = authData.user?.id;
    
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("primeiro_acesso")
        .eq("id", userId)
        .single();

      if (profile?.primeiro_acesso === true) {
        setMensagem("Primeiro acesso! Redirecionando...");
        setTipoMensagem("sucesso");
        router.push("/completar-cadastro");
        return;
      }
    }

    setMensagem("Login realizado! Redirecionando...");
    setTipoMensagem("sucesso");
    router.push("/dashboard");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b132b] px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1c2541] p-8">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          className="mb-3 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyPress={handleKeyPress}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-[#3a86ff] py-3 font-semibold text-white transition hover:bg-[#2d6fd9] disabled:opacity-50"
        >
          {loading ? "Aguarde..." : "Entrar"}
        </button>

        {/* ✅ Aviso para novos usuários */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Primeiro acesso? Use a senha: <span className="font-mono text-[#06d6a0]">primeiroacesso</span>
        </p>

        {mensagem && (
          <p
            className={`mt-4 text-center text-sm ${
              tipoMensagem === "erro" ? "text-red-400" : "text-green-400"
            }`}
          >
            {mensagem}
          </p>
        )}
      </div>
    </div>
  );
}
