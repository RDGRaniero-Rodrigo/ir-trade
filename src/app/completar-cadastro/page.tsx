"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CompletarCadastroPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"erro" | "sucesso">("erro");

  // Campos do formulário
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");

  // Carrega dados existentes
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        // Se não for primeiro acesso, redireciona para dashboard
        if (profile.primeiro_acesso === false) {
          router.push("/dashboard");
          return;
        }
        
        setNomeCompleto(profile.nome_completo || "");
        setCpf(profile.cpf || "");
        setWhatsapp(profile.whatsapp || "");
      }

      setLoadingPage(false);
    };

    loadProfile();
  }, [supabase, router]);

  // Formata CPF enquanto digita
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  // Formata WhatsApp enquanto digita
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleSubmit = async () => {
    // Validações
    if (!novaSenha || !confirmarSenha) {
      setMensagem("Preencha a nova senha");
      setTipoMensagem("erro");
      return;
    }

    if (novaSenha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres");
      setTipoMensagem("erro");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem("As senhas não conferem");
      setTipoMensagem("erro");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      // 1️⃣ Atualiza a senha no Auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (passwordError) {
        setMensagem("Erro ao atualizar senha: " + passwordError.message);
        setTipoMensagem("erro");
        setLoading(false);
        return;
      }

      // 2️⃣ Atualiza o profile
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            nome_completo: nomeCompleto,
            cpf: cpf.replace(/\D/g, ""), // Salva só números
            whatsapp: whatsapp.replace(/\D/g, ""), // Salva só números
            primeiro_acesso: false, // ✅ Marca como concluído!
          })
          .eq("id", user.id);

        if (profileError) {
          console.error("Erro ao atualizar profile:", profileError);
        }
      }

      setMensagem("Cadastro concluído! Redirecionando...");
      setTipoMensagem("sucesso");

      // 3️⃣ Redireciona para o dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err) {
      console.error("Erro:", err);
      setMensagem("Erro ao salvar dados");
      setTipoMensagem("erro");
      setLoading(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b]">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b132b] px-4">
      <div className="w-full max-w-md rounded-xl bg-[#1c2541] p-8">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          Complete seu Cadastro
        </h2>
        <p className="mb-6 text-center text-sm text-slate-400">
          Defina sua nova senha para continuar
        </p>

        {/* Nome Completo */}
        <label className="mb-1 block text-sm text-slate-400">Nome Completo</label>
        <input
          type="text"
          placeholder="Seu nome completo"
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        {/* CPF */}
        <label className="mb-1 block text-sm text-slate-400">CPF</label>
        <input
          type="text"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCPF(e.target.value))}
          maxLength={14}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        {/* WhatsApp */}
        <label className="mb-1 block text-sm text-slate-400">WhatsApp</label>
        <input
          type="text"
          placeholder="(11) 99999-9999"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
          maxLength={15}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        {/* Nova Senha */}
        <label className="mb-1 block text-sm text-slate-400">Nova Senha *</label>
        <input
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        {/* Confirmar Senha */}
        <label className="mb-1 block text-sm text-slate-400">Confirmar Senha *</label>
        <input
          type="password"
          placeholder="Repita a nova senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          className="mb-6 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-[#06d6a0] py-3 font-semibold text-black transition hover:bg-[#05b384] disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Concluir Cadastro"}
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
