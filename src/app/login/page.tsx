"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setMensagem("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Erro ao fazer login");
    } else {
      window.location.href = "/dashboard";
    }

    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    setMensagem("");

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      setMensagem("Erro ao criar conta");
    } else {
      setMensagem("Conta criada! Verifique seu email.");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        background: "#0b132b",
        color: "white",
      }}
    >
      <div
        style={{
          background: "#1c2541",
          padding: 30,
          borderRadius: 10,
          width: 300,
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 8 }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10,
            background: "#3a86ff",
            color: "white",
            border: "none",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          onClick={handleSignup}
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#06d6a0",
            color: "black",
            border: "none",
          }}
        >
          Criar conta
        </button>

        {mensagem && (
          <p style={{ marginTop: 10, fontSize: 14 }}>{mensagem}</p>
        )}
      </div>
    </div>
  );
}