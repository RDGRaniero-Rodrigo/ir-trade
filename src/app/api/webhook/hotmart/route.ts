import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📦 Payload completo:", JSON.stringify(body, null, 2));

    const event: string = body?.event;
    const data = body?.data;

    // 👤 Dados do comprador
    const email: string = data?.buyer?.email;
    const nome: string = data?.buyer?.first_name || data?.buyer?.name;
    const sobrenome: string = data?.buyer?.last_name;
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

    // ✅ Cria ou busca userId
    let userId: string | undefined;

    // 1️⃣ Tenta criar no Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: cpf || "IrTrade@2024",
        email_confirm: true,
      });

    if (authError) {
      console.log("⚠️ Auth createUser error:", authError.message);
    }

    userId = authData?.user?.id;
    console.log("🆔 userId após createUser:", userId);

    // 2️⃣ Busca na tabela profiles (usa maybeSingle em vez de single)
    if (!userId) {
      console.log("🔍 Buscando userId na tabela profiles...");

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .limit(1);

      if (profileError) {
        console.log("⚠️ Erro ao buscar profile:", profileError.message);
      } else {
        console.log("📋 Profiles encontrados:", profileRows);
      }

      userId = profileRows?.[0]?.id;
      console.log("🆔 userId via profiles:", userId);
    }

    // 3️⃣ Busca no Auth via listUsers (com log completo)
    if (!userId) {
      console.log("🔍 Buscando userId via listUsers...");

      let page = 1;

      while (true) {
        const { data: userList, error: listError } =
          await supabase.auth.admin.listUsers({ page, perPage: 1000 });

        if (listError) {
          console.error("❌ Erro ao listar usuários:", listError.message);
          break;
        }

        console.log(
          `📄 Página ${page}: ${userList?.users?.length} usuários encontrados`
        );

        const match = userList?.users?.find((u) => u.email === email);

        if (match) {
          userId = match.id;
          console.log("✅ Usuário encontrado via listUsers:", userId);
          break;
        }

        if (!userList?.users?.length || userList.users.length < 1000) {
          console.log("🔚 Fim da lista, usuário não encontrado");
          break;
        }

        page++;
      }
    }

    // 🚨 Segurança: nunca continua sem userId
    if (!userId) {
      console.error("❌ userId não encontrado para:", email);
      return NextResponse.json(
        { error: "Usuário não encontrado no Auth" },
        { status: 500 }
      );
    }

    let updateData: Record<string, unknown> = {
      email,
      nome_completo: `${nome || ""} ${sobrenome || ""}`.trim(),
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
    };

    // ✅ Monta dados conforme evento
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

    // ✅ Upsert — insere ou atualiza pelo email
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        { ...updateData, id: userId },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error(
        "❌ Erro Supabase upsert:",
        upsertError.message,
        upsertError.details,
        upsertError.hint
      );
      return NextResponse.json(
        { error: "Erro ao salvar no banco", details: upsertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Webhook OK: ${event} - ${email}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
