import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ⚠️ ROTA TEMPORÁRIA - DELETAR DEPOIS DO TESTE
export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = "zecaraniero@gmail.com";
    const senha = "primeiroacesso";

    // 1. Cria o usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ 
        erro: "Falha ao criar usuário", 
        detalhes: authError.message 
      }, { status: 400 });
    }

    // 2. Cria o perfil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        nome: "Zeca Teste",
        telefone: null,
        senha_temporaria: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      return NextResponse.json({ 
        erro: "Falha ao criar perfil", 
        detalhes: profileError.message 
      }, { status: 400 });
    }

    // 3. Retorna sucesso
    return NextResponse.json({
      sucesso: true,
      mensagem: "✅ Usuário criado com sucesso!",
      dados: {
        email,
        senha,
        user_id: authData.user.id
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      erro: "Erro inesperado", 
      detalhes: error.message 
    }, { status: 500 });
  }
}
