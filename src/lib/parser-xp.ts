import { detectarCorretora, type CorretoraDetectada } from "./detectar-corretora";

export type DadosXP = {
  corretora: CorretoraDetectada;
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

function parseNumeroBR(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function limparTexto(texto: string): string {
  return texto
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extrairDadosXP(textoOriginal: string): DadosXP {
  const dados: DadosXP = {
    corretora: detectarCorretora(textoOriginal),
    numeroNota: null,
    dataPregao: null,
    cliente: null,
    valorNegocios: 0,
    irrf: 0,
    taxaBmf: 0,
    taxaOperacional: 0,
    custos: 0,
    totalLiquidoNota: 0,
    sinalLiquido: null,
  };

  if (!textoOriginal || typeof textoOriginal !== "string") {
    return dados;
  }

  const texto = limparTexto(textoOriginal);

  // Número da nota
  {
    const match = texto.match(/Nr\.\s*nota\s*([0-9.]+)/i);
    if (match) dados.numeroNota = match[1];
  }

  // Data do pregão
  {
    const match = texto.match(/Data\s+preg[aã]o\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) dados.dataPregao = match[1];
  }

  // Código do cliente
  {
    const match = texto.match(/C[oó]digo\s+do\s+Cliente\s*(\d{4,})/i);
    if (match) dados.cliente = match[1];
  }

  // Valor dos negócios
  {
    const match = texto.match(
      /Valor\s+dos\s+neg[oó]cios\s+(?:\d{1,3}(?:\.\d{3})*,\d{2}\s+){4}(\d{1,3}(?:\.\d{3})*,\d{2})\s*[CD]?/i
    );

    if (match) {
      dados.valorNegocios = parseNumeroBR(match[1]);
    }
  }

  // Bloco das taxas
  {
    const match = texto.match(
      /IRRF\s+IRRF\s+Day\s+Trade(?:\s+\(proj\.\))?\s+Taxa\s+operacional\s+Taxa\s+registro\s+BM&F\s+Taxas\s+BM&F\s+\(emol\+f\.gar\)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );

    if (match) {
      const irrfNormal = parseNumeroBR(match[1]);
      const irrfDayTrade = parseNumeroBR(match[2]);
      const taxaOperacional = parseNumeroBR(match[3]);
      const taxaRegistro = parseNumeroBR(match[4]);
      const taxaBmfEmol = parseNumeroBR(match[5]);

      void irrfNormal;

      dados.irrf = irrfDayTrade;
      dados.taxaOperacional = taxaOperacional;
      dados.taxaBmf = Number((taxaRegistro + taxaBmfEmol).toFixed(2));
    }
  }

  // Total líquido da nota
  {
    const trechoMatch = texto.match(
      /Total\s+l[ií]quido\s+da\s+nota\s+(.*?)(?:\+Custos\s+BM&F|Capitais\s+e\s+regi[oõ]es|$)/i
    );

    if (trechoMatch) {
      const trecho = trechoMatch[1];
      const pares = [...trecho.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])/gi)];

      if (pares.length > 0) {
        const ultimoPar = pares[pares.length - 1];
        dados.totalLiquidoNota = parseNumeroBR(ultimoPar[1]);
        dados.sinalLiquido = ultimoPar[2].toUpperCase() as "C" | "D";
      }
    }
  }

  dados.custos = Number((dados.taxaBmf + dados.taxaOperacional).toFixed(2));

  return dados;
}