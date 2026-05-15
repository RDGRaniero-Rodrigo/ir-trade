"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetSenhaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"erro" | "sucesso">("erro");
  const [sessaoValida, setSessaoValida] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    const verificarSessao = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setSessaoValida(true);
      } else {
        setMensagem(
          "Link inválido ou expirado. Solicite um novo e-mail de redefinição."
        );
        setTipoMensagem("erro");
      }

      setVerificando(false);
    };

    verificarSessao();
  }, []);

  const handleRedefinir = async () => {
    if (!novaSenha || !confirmarSenha) {
      setMensagem("Preencha os dois campos.");
      setTipoMensagem("erro");
      return;
    }

    if (novaSenha.length < 6) {
      setMensagem("A senha deve ter no mínimo 6 caracteres.");
      setTipoMensagem("erro");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      setTipoMensagem("erro");
      return;
    }

    setLoading(true);
    setMensagem("");

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    setLoading(false);

    if (error) {
      setMensagem("Erro ao redefinir senha. Tente novamente.");
      setTipoMensagem("erro");
      return;
    }

    // ✅ Rota corrigida
    router.push("/reset-password/confirmado");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleRedefinir();
    }
  };

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b]">
        <p className="text-slate-400">Verificando link...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b132b] px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1c2541] p-8">
        <h2 className="mb-2 text-center text-2xl font-bold text-white">
          Redefinir senha
        </h2>
        <p className="mb-6 text-center text-sm text-slate-400">
          Digite e confirme sua nova senha
        </p>

        {sessaoValida ? (
          <>
            <input
              type="password"
              placeholder="Nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mb-3 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />

            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mb-4 w-full rounded-lg border border-slate-600 bg-[#0b132b] px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />

            <button
              onClick={handleRedefinir}
              disabled={loading}
              className="w-full rounded-lg bg-[#3a86ff] py-3 font-semibold text-white transition hover:bg-[#2d6fd9] disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </>
        ) : (
          // ✅ Ação para sessão inválida
          <div className="text-center">
            <a
              href="/reset-password"
              className="text-sm text-[#3a86ff] hover:text-[#2d6fd9] transition"
            >
              Solicitar novo link →
            </a>
          </div>
        )}

        {mensagem && (
          <p
            className={`mt-4 text-center text-sm ${
              tipoMensagem === "erro" ? "text-red-400" : "text-green-400"
            }`}
          >
            {mensagem}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          <a href="/login" className="hover:text-[#3a86ff] transition">
            ← Voltar ao login
          </a>
        </p>
      </div>
    </div>
  );
}
