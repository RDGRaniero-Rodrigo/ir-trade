import { createClient } from "@/lib/supabase/client";

export type NotaB3Insert = {
  numeroNota: string;
  dataPregao: string;
  cliente: string;
  valorNegocios: number;
  irrf: number;
  custos: number;
  valorLiquido: number;
  sinalLiquido: "C" | "D" | null;
};

export type NotaForexInsert = {
  dataRelatorio: string;
  conta: string;
  cliente: string;
  moeda: string;
  ativoPrincipal: string | null;
  saldoInicialUsd: number;
  depositoRetiradaUsd: number;
  resultadoDiaUsd: number;
  saldoFinalUsd: number;
  equityFinalUsd: number;
  floatingUsd: number;
};

export type NotaB3Banco = {
  id: string;
  user_id: string;
  numero_nota: string | null;
  data_pregao: string | null;
  cliente: string | null;
  valor_negocios: number;
  irrf: number;
  custos: number;
  valor_liquido: number;
  sinal_liquido: "C" | "D" | null;
  created_at: string;
};

export type NotaForexBanco = {
  id: string;
  user_id: string;
  data_relatorio: string | null;
  conta: string | null;
  cliente: string | null;
  moeda: string | null;
  ativo_principal: string | null;
  saldo_inicial_usd: number;
  deposito_retirada_usd: number;
  resultado_dia_usd: number;
  saldo_final_usd: number;
  equity_final_usd: number;
  floating_usd: number;
  created_at: string;
};

async function getUsuarioAtual() {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  return user;
}

export async function listarNotasB3() {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const { data, error } = await supabase
    .from("notas_b3")
    .select("*")
    .eq("user_id", user.id)
    .order("data_pregao", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NotaB3Banco[];
}

export async function listarNotasForex() {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const { data, error } = await supabase
    .from("notas_forex")
    .select("*")
    .eq("user_id", user.id)
    .order("data_relatorio", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NotaForexBanco[];
}
function converterDataBRParaISO(data: string) {
  if (!data) return null;

  const partes = data.split("/");
  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}
export async function salvarNotaB3(nota: NotaB3Insert) {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const payload = {
    user_id: user.id,
    numero_nota: nota.numeroNota || null,
    data_pregao: nota.dataPregao ? converterDataBRParaISO(nota.dataPregao) : null,
    cliente: nota.cliente || null,
    valor_negocios: nota.valorNegocios ?? 0,
    irrf: nota.irrf ?? 0,
    custos: nota.custos ?? 0,
    valor_liquido: nota.valorLiquido ?? 0,
    sinal_liquido: nota.sinalLiquido ?? null,
  };

  const { data, error } = await supabase
    .from("notas_b3")
    .insert(payload)
    .select()
    .single();

  if (error) {
  console.error("Erro Supabase salvarNotaB3:", error);
  throw new Error(error.message);
}

  return data as NotaB3Banco;
}

export async function salvarNotaForex(nota: NotaForexInsert) {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const payload = {
    user_id: user.id,
    data_relatorio: nota.dataRelatorio || null,
    conta: nota.conta || null,
    cliente: nota.cliente || null,
    moeda: nota.moeda || null,
    ativo_principal: nota.ativoPrincipal || null,
    saldo_inicial_usd: nota.saldoInicialUsd ?? 0,
    deposito_retirada_usd: nota.depositoRetiradaUsd ?? 0,
    resultado_dia_usd: nota.resultadoDiaUsd ?? 0,
    saldo_final_usd: nota.saldoFinalUsd ?? 0,
    equity_final_usd: nota.equityFinalUsd ?? 0,
    floating_usd: nota.floatingUsd ?? 0,
  };

  const { data, error } = await supabase
    .from("notas_forex")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as NotaForexBanco;
}

export async function excluirNotaB3(id: string) {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const { error } = await supabase
    .from("notas_b3")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function excluirNotaForex(id: string) {
  const supabase = createClient();
  const user = await getUsuarioAtual();

  const { error } = await supabase
    .from("notas_forex")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}