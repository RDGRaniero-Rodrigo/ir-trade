import { NextRequest, NextResponse } from 'next/server'

// API oficial do Banco Central do Brasil
const BCB_API_URL = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata'

interface PtaxResponse {
  value: Array<{
    cotacaoCompra: number
    cotacaoVenda: number
    dataHoraCotacao: string
  }>
}

/**
 * Busca a cotação PTAX do dólar em uma data específica
 * Se não houver cotação na data (fim de semana/feriado), busca a última disponível
 */
async function buscarPtax(data: string): Promise<number | null> {
  try {
    // Formato da data para a API do BCB: 'MM-DD-YYYY'
    const [ano, mes, dia] = data.split('-')
    const dataFormatada = `'${mes}-${dia}-${ano}'`

    // Busca cotação de fechamento do dia
    const url = `${BCB_API_URL}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=${dataFormatada}&$format=json`

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache de 1 hora
    })

    if (!response.ok) {
      console.error('Erro na API do BCB:', response.status)
      return null
    }

    const resultado: PtaxResponse = await response.json()

    if (resultado.value && resultado.value.length > 0) {
      // Retorna a cotação de venda (usada para conversão de ganhos)
      return resultado.value[resultado.value.length - 1].cotacaoVenda
    }

    // Se não encontrou cotação na data, busca a última disponível
    return await buscarUltimaPtax(data)

  } catch (error) {
    console.error('Erro ao buscar PTAX:', error)
    return null
  }
}

/**
 * Busca a última cotação PTAX disponível antes de uma data
 * Útil para fins de semana e feriados
 */
async function buscarUltimaPtax(dataLimite: string): Promise<number | null> {
  try {
    const [ano, mes, dia] = dataLimite.split('-')
    const dataFormatada = `'${mes}-${dia}-${ano}'`

    // Busca as últimas 5 cotações antes da data
    const url = `${BCB_API_URL}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinal)?@dataInicial='01-01-${ano}'&@dataFinal=${dataFormatada}&$orderby=dataHoraCotacao%20desc&$top=1&$format=json`

    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    const resultado: PtaxResponse = await response.json()

    if (resultado.value && resultado.value.length > 0) {
      return resultado.value[0].cotacaoVenda
    }

    return null

  } catch (error) {
    console.error('Erro ao buscar última PTAX:', error)
    return null
  }
}

/**
 * GET /api/cotacao-dolar?data=2024-03-15
 * Retorna a cotação PTAX do dólar para a data especificada
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const data = searchParams.get('data')

    // Se não passar data, usa a data atual
    const dataConsulta = data || new Date().toISOString().split('T')[0]

    // Valida formato da data (YYYY-MM-DD)
    const regexData = /^\d{4}-\d{2}-\d{2}$/
    if (!regexData.test(dataConsulta)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const cotacao = await buscarPtax(dataConsulta)

    if (cotacao === null) {
      return NextResponse.json(
        { error: 'Não foi possível obter a cotação para esta data' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: dataConsulta,
      cotacao: cotacao,
      moeda: 'USD/BRL',
      fonte: 'BCB-PTAX'
    })

  } catch (error) {
    console.error('Erro na API de cotação:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cotação' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cotacao-dolar
 * Body: { data: "2024-03-15" }
 * Alternativa para buscar via POST
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data } = body

    if (!data) {
      return NextResponse.json(
        { error: 'Campo "data" é obrigatório' },
        { status: 400 }
      )
    }

    // Valida formato da data (YYYY-MM-DD)
    const regexData = /^\d{4}-\d{2}-\d{2}$/
    if (!regexData.test(data)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const cotacao = await buscarPtax(data)

    if (cotacao === null) {
      return NextResponse.json(
        { error: 'Não foi possível obter a cotação para esta data' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
      cotacao: cotacao,
      moeda: 'USD/BRL',
      fonte: 'BCB-PTAX'
    })

  } catch (error) {
    console.error('Erro na API de cotação:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cotação' },
      { status: 500 }
    )
  }
}
