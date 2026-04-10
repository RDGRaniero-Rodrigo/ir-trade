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

export async function obterCotacaoPtax(data: string): Promise<number> {
  try {
    const dataNormalizada = normalizarData(data)

    if (!dataNormalizada) return 0

    const resposta = await fetch(`/api/cotacao-dolar?data=${dataNormalizada}`, {
      method: "GET",
      cache: "no-store",
    })

    if (!resposta.ok) return 0

    const json = await resposta.json()

    const cotacao = Number(json?.cotacao)

    if (!cotacao || Number.isNaN(cotacao)) {
      return 0
    }

    return cotacao
  } catch {
    return 0
  }
}