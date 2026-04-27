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

// ─── Extrai campos financeiros de um bloco de texto (1 página) ────────────────
function extrairFinanceiro(texto: string, dados: DadosXP): void {

  // Valor dos negócios
  {
    const match = texto.match(
      /Valor\s+dos\s+neg[oó]cios\s+(?:\d{1,3}(?:\.\d{3})*,\d{2}\s+){4}(\d{1,3}(?:\.\d{3})*,\d{2})\s*[CD]?/i
    );
    if (match) {
      const val = parseNumeroBR(match[1]);
      if (val > 0) dados.valorNegocios = val; // só sobrescreve se valor real
    }
  }

  // Bloco das taxas (IRRF, taxa operacional, BM&F)
  {
    const match = texto.match(
      /IRRF\s+IRRF\s+Day\s+Trade(?:\s+\(proj\.\))?\s+Taxa\s+operacional\s+Taxa\s+registro\s+BM&F\s+Taxas\s+BM&F\s+\(emol\+f\.gar\)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      const irrfDayTrade    = parseNumeroBR(match[2]);
      const taxaOperacional = parseNumeroBR(match[3]);
      const taxaRegistro    = parseNumeroBR(match[4]);
      const taxaBmfEmol     = parseNumeroBR(match[5]);

      // só sobrescreve se encontrou valores reais na página
      if (irrfDayTrade > 0 || taxaOperacional > 0) {
        dados.irrf            = irrfDayTrade;
        dados.taxaOperacional = taxaOperacional;
        dados.taxaBmf         = Number((taxaRegistro + taxaBmfEmol).toFixed(2));
      }
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
        const val = parseNumeroBR(ultimoPar[1]);
        if (val > 0) { // só sobrescreve se valor real
          dados.totalLiquidoNota = val;
          dados.sinalLiquido = ultimoPar[2].toUpperCase() as "C" | "D";
        }
      }
    }
  }
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

  // ─── Divide o texto em páginas pelo separador \f ───────────────────────────
  const paginas = textoOriginal
    .split("\f")
    .map(limparTexto)
    .filter((p) => p.length > 0);

  // Fallback: se não houver \f, trata como página única
  const paginasFinais = paginas.length > 0 ? paginas : [limparTexto(textoOriginal)];
  const primeiraPagina = paginasFinais[0];

  // ─── Cabeçalho: busca APENAS na primeira página ───────────────────────────
  {
    const match = primeiraPagina.match(/Nr\.\s*nota\s*([0-9.]+)/i);
    if (match) dados.numeroNota = match[1];
  }
  {
    const match = primeiraPagina.match(/Data\s+preg[aã]o\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) dados.dataPregao = match[1];
  }
  {
    const match = primeiraPagina.match(/C[oó]digo\s+do\s+Cliente\s*(\d{4,})/i);
    if (match) dados.cliente = match[1];
  }

  // ─── Financeiro: varre TODAS as páginas em ordem ──────────────────────────
  // A última página com valores reais (> 0) vence
  for (const pagina of paginasFinais) {
    extrairFinanceiro(pagina, dados);
  }

  // ─── Custos totais ─────────────────────────────────────────────────────────
  dados.custos = Number((dados.taxaBmf + dados.taxaOperacional).toFixed(2));

  return dados;
}
