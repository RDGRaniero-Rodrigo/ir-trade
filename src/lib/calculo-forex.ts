import { obterCotacaoPtax } from "./cotacao-dolar";

export type RelatorioForex = {
  id?: string;
  data?: string;
  saldoInicial?: number;
  resultadoDia?: number;
  depositoRetirada?: number;
  saldoFinal?: number;
};

export type ResumoMensalForex = {
  mes: string;
  chave: string;
  ano: number;
  mesNumero: number;
  quantidadeRelatorios: number;
  resultadoMesUSD: number;
  depositoRetiradaUSD: number;
  cotacaoMedia: number;
  resultadoConvertidoBRL: number;
  impostoEstimado: number;
  darfPagar: number;
  possuiImposto: boolean;
};

function normalizarData(data: string): string {
  if (!data) return "";

  const texto = data.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  const d = new Date(texto);
  if (Number.isNaN(d.getTime())) return "";

  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function obterMesDaData(data: string): string {
  const dataNormalizada = normalizarData(data);
  return dataNormalizada.slice(0, 7);
}

function formatarNomeMes(mes: string): string {
  const [ano, numeroMes] = mes.split("-");
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const indice = Number(numeroMes) - 1;
  return `${nomes[indice]}/${ano}`;
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export async function calcularFechamentoMensalForex(
  relatorios: RelatorioForex[],
  mes: string
): Promise<ResumoMensalForex> {
  const relatoriosDoMes = relatorios
    .map((item) => ({
      ...item,
      data: normalizarData(item.data || ""),
      saldoInicial: Number(item.saldoInicial || 0),
      resultadoDia: Number(item.resultadoDia || 0),
      depositoRetirada: Number(item.depositoRetirada || 0),
      saldoFinal: Number(item.saldoFinal || 0),
    }))
    .filter((item) => item.data && obterMesDaData(item.data) === mes)
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

  const [anoStr, mesStr] = mes.split("-");
  const ano = Number(anoStr);
  const mesNumero = Number(mesStr);

  if (relatoriosDoMes.length === 0) {
    return {
      mes: formatarNomeMes(mes),
      chave: mes,
      ano,
      mesNumero,
      quantidadeRelatorios: 0,
      resultadoMesUSD: 0,
      depositoRetiradaUSD: 0,
      cotacaoMedia: 0,
      resultadoConvertidoBRL: 0,
      impostoEstimado: 0,
      darfPagar: 0,
      possuiImposto: false,
    };
  }

  let resultadoMesUSD = 0;
  let depositoRetiradaUSD = 0;
  let somaCotacoes = 0;
  let quantidadeCotacoes = 0;
  let resultadoConvertidoBRL = 0;

  for (const item of relatoriosDoMes) {
    const cotacaoDia = await obterCotacaoPtax(item.data || "");

    resultadoMesUSD += item.resultadoDia || 0;
    depositoRetiradaUSD += item.depositoRetirada || 0;

    if (cotacaoDia > 0) {
      somaCotacoes += cotacaoDia;
      quantidadeCotacoes += 1;
      resultadoConvertidoBRL += (item.resultadoDia || 0) * cotacaoDia;
    }
  }

  const cotacaoMedia =
    quantidadeCotacoes > 0 ? somaCotacoes / quantidadeCotacoes : 0;

  const impostoEstimado =
    resultadoConvertidoBRL > 0 ? resultadoConvertidoBRL * 0.15 : 0;

  return {
    mes: formatarNomeMes(mes),
    chave: mes,
    ano,
    mesNumero,
    quantidadeRelatorios: relatoriosDoMes.length,
    resultadoMesUSD: arredondar(resultadoMesUSD),
    depositoRetiradaUSD: arredondar(depositoRetiradaUSD),
    cotacaoMedia: arredondar(cotacaoMedia),
    resultadoConvertidoBRL: arredondar(resultadoConvertidoBRL),
    impostoEstimado: arredondar(impostoEstimado),
    darfPagar: arredondar(impostoEstimado),
    possuiImposto: impostoEstimado > 0,
  };
}

export async function calcularFechamentosMensaisForex(
  relatorios: RelatorioForex[]
): Promise<ResumoMensalForex[]> {
  const relatoriosNormalizados = relatorios
    .map((item) => ({
      ...item,
      data: normalizarData(item.data || ""),
      saldoInicial: Number(item.saldoInicial || 0),
      resultadoDia: Number(item.resultadoDia || 0),
      depositoRetirada: Number(item.depositoRetirada || 0),
      saldoFinal: Number(item.saldoFinal || 0),
    }))
    .filter((item) => item.data);

  const mesesUnicos = Array.from(
    new Set(
      relatoriosNormalizados.map((item) => obterMesDaData(item.data || ""))
    )
  ).sort((a, b) => b.localeCompare(a));

  const resultados: ResumoMensalForex[] = [];

  for (const mes of mesesUnicos) {
    const resumo = await calcularFechamentoMensalForex(
      relatoriosNormalizados,
      mes
    );
    resultados.push(resumo);
  }

  return resultados;
}