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

    // ✅ Cria ou busca usuário no Supabase Auth
    let userId: string | undefined;

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: cpf || "IrTrade@2024",
        email_confirm: true,
      });

    if (authData?.user?.id) {
      // Usuário criado agora
      userId = authData.user.id;
    } else if (authError?.message.includes("already been registered")) {
      // Usuário já existia → busca pelo email
      const { data: existingUsers } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const found = existingUsers?.users?.find((u) => u.email === email);
      userId = found?.id;
    } else if (authError) {
      console.error("❌ Erro ao criar usuário no Auth:", authError.message);
      return NextResponse.json(
        { error: "Erro ao criar usuário no Auth" },
        { status: 500 }
      );
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

    // ✅ Trata os eventos
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

    // ✅ Verifica se já existe no profiles
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    let error;

    if (existingUser) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("email", email);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ ...updateData, id: userId });
      error = insertError;
    }

    if (error) {
      console.error("❌ Erro Supabase:", error.message, error.details, error.hint);
      return NextResponse.json(
        { error: "Erro ao salvar no banco", details: error.message },
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
