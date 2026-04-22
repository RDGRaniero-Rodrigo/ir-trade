if (
  event === "PURCHASE_APPROVED" ||
  event === "PURCHASE_COMPLETE" ||        // ← ADICIONA ESSE
  event === "PURCHASE_BILLET_PRINTED"     // ← boleto gerado (opcional)
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
  event === "PURCHASE_CHARGEBACK" ||      // ← ADICIONA ESSE
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
  return NextResponse.json({ success: true }, { status: 200 }); // retorna 200 pra não ficar em retentativa
}
