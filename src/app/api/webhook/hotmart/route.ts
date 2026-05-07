// app/api/webhook/hotmart/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Senha padrão para novos usuários
const SENHA_TEMPORARIA = "primeiroacesso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📦 Payload completo:", JSON.stringify(body, null, 2));

    const event: string = body?.event;
    const data = body?.data;

    // 👤 Dados do comprador
    const emailRaw: string = data?.buyer?.email;
    const email = emailRaw?.trim().toLowerCase();
    const nome: string = data?.buyer?.first_name || data?.buyer?.name;
    const sobrenome: string = data?.buyer?.last_name;
    const nomeCompleto = `${nome || ""} ${sobrenome || ""}`.trim();
    const cpf: string = data?.buyer?.document;
    const ddd: string = data?.buyer?.checkout_phone_code;
    const telefone: string = data?.buyer?.checkout_phone;
    const whatsapp = ddd && telefone ? `${ddd}${telefone}` : null;

    // 🏠 Endereço
    const endereco = data?.buyer?.address?.address;
    const numero_end = data?.buyer?.address?.number;
    const complemento = data?.buyer?.address?.complement;
    const bairro = data?.buyer?.address?.neighborhood;
    const cidade = data?.buyer?.address?.city;
    const estado = data?.buyer?.address?.state;
    const cep = data?.buyer?.address?.zipcode;

    // 💳 Dados da compra
    const transaction: string = data?.purchase?.transaction;
    const plano: string = data?.subscription?.plan?.name || data?.product?.name;
    const metodo_pagamento: string = data?.purchase?.payment?.type;
    const valor: number = data?.purchase?.full_price?.value;

    if (!email) {
      return NextResponse.json(
        { error: "Email não encontrado no payload" },
        { status: 400 }
      );
    }

    console.log("📧 Email normalizado:", `[${email}]`);

    // ✅ Eventos ignorados
    const eventosIgnorados = [
      "PURCHASE_PROTEST",
      "PURCHASE_DELAYED",
      "PURCHASE_EXPIRED",
      "SWITCH_PLAN",
    ];

    if (eventosIgnorados.includes(event)) {
      console.log(`⚠️ Evento ignorado: ${event}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ✅ Busca userId existente
    let userId: string | undefined;
    let isNewUser = false;

    // 1️⃣ Busca na tabela profiles
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .limit(1);

    userId = profileRows?.[0]?.id;

    // 2️⃣ Se não achou, busca no Auth
    if (!userId) {
      const { data: userList } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const match = userList?.users?.find(
        (u) => u.email?.trim().toLowerCase() === email
      );

      userId = match?.id;
    }

    // 3️⃣ Se ainda não existe, CRIA o usuário com senha fixa
    if (!userId) {
      console.log("🆕 Criando novo usuário com senha temporária...");

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: email,
          password: SENHA_TEMPORARIA, // ✅ Senha fixa!
          email_confirm: true,
          user_metadata: {
            nome_completo: nomeCompleto,
            primeiro_acesso: true,
          },
        });

      if (authError) {
        console.error("❌ Erro ao criar usuário:", authError.message);
        return NextResponse.json(
          { error: "Erro ao criar usuário", details: authError.message },
          { status: 500 }
        );
      }

      userId = authData?.user?.id;
      isNewUser = true;

      console.log("✅ Usuário criado com senha temporária:", userId);
    }

    // 🚨 Segurança
    if (!userId) {
      console.error("❌ userId não encontrado para:", email);
      return NextResponse.json(
        { error: "Usuário não encontrado no Auth" },
        { status: 500 }
      );
    }

    // ✅ Monta dados para salvar
    let updateData: Record<string, unknown> = {
      email,
      nome_completo: nomeCompleto,
      cpf,
      whatsapp,
      endereco,
      numero_end,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      plano,
      metodo_pagamento,
      valor,
      hotmart_transaction_id: transaction,
      primeiro_acesso: isNewUser ? true : undefined, // Só seta se for novo
    };

    // Remove campos undefined
    updateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    // ✅ Dados conforme evento
    if (
      event === "PURCHASE_APPROVED" ||
      event === "PURCHASE_COMPLETE" ||
      event === "PURCHASE_BILLET_PRINTED"
    ) {
      updateData = {
        ...updateData,
        status_assinatura: "active",
        pago: true,
        data_pagamento: new Date().toISOString(),
        data_expiracao: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };
    } else if (
      event === "PURCHASE_CANCELED" ||
      event === "PURCHASE_REFUNDED" ||
      event === "PURCHASE_CHARGEBACK" ||
      event === "SUBSCRIPTION_CANCELLATION"
    ) {
      updateData = {
        ...updateData,
        status_assinatura: "inativo",
        pago: false,
        data_expiracao: new Date().toISOString(),
      };
    } else {
      console.log(`⚠️ Evento não tratado: ${event}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ✅ Upsert no profiles
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ ...updateData, id: userId }, { onConflict: "id" });

    if (upsertError) {
      console.error("❌ Erro Supabase upsert:", upsertError.message);
      return NextResponse.json(
        { error: "Erro ao salvar no banco", details: upsertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Webhook OK: ${event} - ${email} (novo: ${isNewUser})`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
