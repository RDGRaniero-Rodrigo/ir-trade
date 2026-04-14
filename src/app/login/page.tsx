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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Email ou senha incorretos");
      setTipoMensagem("erro");
      setLoading(false);
    } else {
      setMensagem("Login realizado! Redirecionando...");
      setTipoMensagem("sucesso");
      router.push("/dashboard");
    }
  };

  const handleSignup = async () => {
    if (!email || !senha) {
      setMensagem("Preencha email e senha");
      setTipoMensagem("erro");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres");
      setTipoMensagem("erro");
      return;
    }

    setLoading(true);
    setMensagem("");

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Erro ao criar conta: " + error.message);
      setTipoMensagem("erro");
    } else {
      setMensagem("Conta criada! Verifique seu email.");
      setTipoMensagem("sucesso");
    }

    setLoading(false);
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
          className="mb-3 w-full rounded-lg bg-[#3a86ff] py-3 font-semibold text-white transition hover:bg-[#2d6fd9] disabled:opacity-50"
        >
          {loading ? "Aguarde..." : "Entrar"}
        </button>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full rounded-lg bg-[#06d6a0] py-3 font-semibold text-black transition hover:bg-[#05b384] disabled:opacity-50"
        >
          Criar conta
        </button>

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
