import { NextRequest, NextResponse } from "next/server"

function formatarDataParaBC(data: string): string {
  const [ano, mes, dia] = data.split("-")
  return `${mes}-${dia}-${ano}`
}

function voltarUmDia(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number)
  const novaData = new Date(ano, mes - 1, dia)
  novaData.setDate(novaData.getDate() - 1)

  const novoAno = novaData.getFullYear()
  const novoMes = String(novaData.getMonth() + 1).padStart(2, "0")
  const novoDia = String(novaData.getDate()).padStart(2, "0")

  return `${novoAno}-${novoMes}-${novoDia}`
}

async function buscarCotacaoNoBC(data: string) {
  const dataFormatada = formatarDataParaBC(data)

  const url =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
    `CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dataFormatada}'&$top=1&$format=json`

  const resposta = await fetch(url, {
    cache: "no-store",
  })

  if (!resposta.ok) {
    return null
  }

  const json = await resposta.json()
  const item = json?.value?.[0]

  if (!item) {
    return null
  }

  return {
    cotacao: Number(item.cotacaoVenda || 0),
    dataEncontrada: data,
    dataHoraCotacao: item.dataHoraCotacao || null,
    fonte: "BCB PTAX",
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const data = searchParams.get("data")

    if (!data) {
      return NextResponse.json(
        { erro: "Data não informada" },
        { status: 400 }
      )
    }

    let dataBusca = data
    let tentativas = 0
    const maxTentativas = 7

    while (tentativas < maxTentativas) {
      const resultado = await buscarCotacaoNoBC(dataBusca)

      if (resultado && resultado.cotacao > 0) {
        return NextResponse.json({
          cotacao: resultado.cotacao,
          dataSolicitada: data,
          dataUsada: resultado.dataEncontrada,
          dataHoraCotacao: resultado.dataHoraCotacao,
          fonte: resultado.fonte,
        })
      }

      dataBusca = voltarUmDia(dataBusca)
      tentativas += 1
    }

    return NextResponse.json({
      cotacao: 0,
      dataSolicitada: data,
      dataUsada: null,
      fonte: "BCB PTAX",
    })
  } catch {
    return NextResponse.json({
      cotacao: 0,
      dataSolicitada: null,
      dataUsada: null,
      fonte: "BCB PTAX",
    })
  }
}