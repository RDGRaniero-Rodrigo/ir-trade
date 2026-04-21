import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const event: string = body.event
    const data = body.data

    const email: string = data?.buyer?.email
    const transaction: string = data?.purchase?.transaction
    const plano: string = data?.product?.name

    const status_assinatura = event === 'PURCHASE_APPROVED' ? 'active' : 'inativo'
    const pago = event === 'PURCHASE_APPROVED'

    const data_pagamento = new Date().toISOString()
    const data_expiracao = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    if (!email) {
      return NextResponse.json(
        { error: 'Email não encontrado no payload' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          email,
          status_assinatura,
          pago,
          plano,
          data_pagamento,
          data_expiracao,
          hotmart_transaction_id: transaction,
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Erro Supabase:', error)
      return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 })
    }

    console.log(`✅ Webhook processado: ${event} - ${email}`)
    return NextResponse.json({ success: true }, { status: 200 })

  } catch (err) {
    console.error('Erro no webhook:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
