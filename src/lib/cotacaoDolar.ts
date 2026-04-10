export type CotacaoDolarDia = {
  data: string
  cotacao: number
}

function normalizarData(data: string): string {
  if (!data) return ""

  const texto = data.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split("/")
    return `${ano}-${mes}-${dia}`
  }

  const d = new Date(texto)
  if (Number.isNaN(d.getTime())) return ""

  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")

  return `${ano}-${mes}-${dia}`
}

export async function buscarCotacaoDolarPorData(data: string): Promise<number> {
  const dataNormalizada = normalizarData(data)

  if (!dataNormalizada) return 0

  try {
    const resposta = await fetch(`/api/cotacao-dolar?data=${dataNormalizada}`, {
      method: "GET",
      cache: "no-store",
    })

    if (!resposta.ok) return 0

    const json = await resposta.json()

    if (typeof json?.cotacao === "number") return json.cotacao

    if (typeof json?.cotacaoCompra === "number") return json.cotacaoCompra

    if (typeof json?.valor === "number") return json.valor

    return 0
  } catch {
    return 0
  }
}

export async function buscarCotacoesEmLote(datas: string[]): Promise<Record<string, number>> {
  const datasUnicas = Array.from(
    new Set(datas.map(normalizarData).filter(Boolean))
  )

  const resultado: Record<string, number> = {}

  await Promise.all(
    datasUnicas.map(async (data) => {
      const cotacao = await buscarCotacaoDolarPorData(data)
      resultado[data] = cotacao
    })
  )

  return resultado
}