export type DadosXP = {
  numeroNota: string | null;
  dataPregao: string | null;
  cliente: string | null;
  valorNegocios: number;
  irrf: number;
  taxaBmf: number;
  taxaOperacional: number;
  custos: number;
  totalLiquidoNota: number;
  sinalLiquido: "C" | "D" | null;
};

export type ResultadoValidacaoNota = {
  valido: boolean;
  erros: string[];
  alertas: string[];
};

function dataValidaBR(data: string | null) {
  if (!data) return false;

  const match = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);

  const dt = new Date(ano, mes - 1, dia);

  return (
    dt.getFullYear() === ano &&
    dt.getMonth() === mes - 1 &&
    dt.getDate() === dia
  );
}

export function validarNotaXP(dados: DadosXP): ResultadoValidacaoNota {
  const erros: string[] = [];
  const alertas: string[] = [];

  if (!dados.numeroNota || !dados.numeroNota.trim()) {
    erros.push("Número da nota não identificado.");
  }

  if (!dataValidaBR(dados.dataPregao)) {
    erros.push("Data do pregão inválida ou não identificada.");
  }

  if (!dados.cliente || !dados.cliente.trim()) {
    erros.push("Código do cliente não identificado.");
  }

  if (!dados.sinalLiquido) {
    erros.push("Sinal do valor líquido não identificado.");
  }

  if (dados.totalLiquidoNota <= 0) {
    alertas.push("Valor líquido zerado ou não identificado.");
  }

  if (dados.valorNegocios <= 0) {
    alertas.push("Valor dos negócios zerado ou não identificado.");
  }

  if (dados.custos < 0) {
    erros.push("Custos inválidos.");
  }

  if (dados.irrf < 0) {
    erros.push("IRRF inválido.");
  }

  if (dados.custos === 0) {
    alertas.push("Custos vieram zerados. Confira se a leitura do PDF está correta.");
  }

  if (dados.irrf === 0) {
    alertas.push("IRRF veio zerado. Confira se a leitura do PDF está correta.");
  }

  return {
    valido: erros.length === 0,
    erros,
    alertas,
  };
}