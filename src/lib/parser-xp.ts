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
  tipoNota: "BMF" | "BOVESPA" | "HIBRIDA" | null;
};

function parseNumeroBR(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function limparTexto(texto: string): string {
  return texto
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\|/g, " | ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Detecta o tipo de UMA página ────────────────────────────────────────────
function detectarTipoPagina(texto: string): "BMF" | "BOVESPA" {
  if (/Mercadoria\s+Vencimento/i.test(texto)) return "BMF";
  if (/Especifica[çc][aã]o\s+do\s+t[ií]tulo/i.test(texto)) return "BOVESPA";
  if (/CBLC|Clearing/i.test(texto)) return "BOVESPA";
  return "BMF";
}

// ─── Extração financeira BM&F ─────────────────────────────────────────────────
function extrairFinanceiroBMF(texto: string, dados: DadosXP): void {
  // Valor dos negócios
  {
    const match = texto.match(
      /Valor\s+dos\s+neg[oó]cios\s+([\d\s,\.]+?)\s*\|\s*([CD])\s*IRRF/i
    );
    if (match) {
      const numeros = match[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
      if (numeros && numeros.length > 0) {
        const val = parseNumeroBR(numeros[numeros.length - 1]);
        if (val > 0) dados.valorNegocios += val;
      }
    }
  }

  // Taxas
  {
    const match = texto.match(
      /Taxas\s+BM&F\s*\(emol\+f\.gar\)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*\|?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      dados.irrf            += parseNumeroBR(match[2]); // IRRF Day Trade
      dados.taxaOperacional += parseNumeroBR(match[3]);
      dados.taxaBmf         += Number((parseNumeroBR(match[4]) + parseNumeroBR(match[5])).toFixed(2));
    }
  }

  // Total líquido da nota
  {
    const match = texto.match(
      /Total\s+l[ií]quido\s+da\s+nota\s+([\s\S]*?)(?:\+Custos|Capitais|$)/i
    );
    if (match) {
      const pares = [...match[1].matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*\|?\s*([CD])/gi)];
      if (pares.length > 0) {
        const ultimo = pares[pares.length - 1];
        const val = parseNumeroBR(ultimo[1]);
        if (val > 0) {
          dados.totalLiquidoNota += val;
          dados.sinalLiquido = ultimo[2].toUpperCase() as "C" | "D";
        }
      }
    }
  }
}

// ─── Extração financeira Bovespa ──────────────────────────────────────────────
function extrairFinanceiroBovespa(texto: string, dados: DadosXP): void {
  // Valor dos negócios (vendas + compras)
  {
    const vendas  = texto.match(/Vendas\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const compras = texto.match(/Compras\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const total = (vendas ? parseNumeroBR(vendas[1]) : 0)
                + (compras ? parseNumeroBR(compras[1]) : 0);
    if (total > 0) dados.valorNegocios += Number(total.toFixed(2));
  }

  // IRRF Day Trade
  {
    const match = texto.match(
      /IRRF\s+Day\s+Trade[:\s]+Base\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+Proje[çc][aã]o\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      const base     = parseNumeroBR(match[1]);
      const projecao = parseNumeroBR(match[2]);
      dados.irrf += projecao > 0 ? projecao : base;
    }
  }

  // Taxa operacional
  {
    const match = texto.match(/Taxa\s+Operacional\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    if (match) dados.taxaOperacional += parseNumeroBR(match[1]);
  }

  // Emolumentos + Taxa de liquidação
  {
    const emol = texto.match(/Emolumentos\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const liq  = texto.match(/Taxa\s+de\s+liquida[çc][aã]o\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const total = (emol ? parseNumeroBR(emol[1]) : 0)
                + (liq  ? parseNumeroBR(liq[1])  : 0);
    if (total > 0) dados.taxaBmf += Number(total.toFixed(2));
  }

  // Líquido para DD/MM/AAAA
  {
    const match = texto.match(
      /L[ií]quido\s+para\s+\d{2}\/\d{2}\/\d{4}\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])/i
    );
    if (match) {
      const val = parseNumeroBR(match[1]);
      if (val > 0) {
        dados.totalLiquidoNota += val;
        dados.sinalLiquido = match[2].toUpperCase() as "C" | "D";
      }
    }
  }
}

// ─── Extração do código do cliente (suporta ambos os layouts) ────────────────
function extrairCodigoCliente(texto: string): string | null {
  // Layout BMF/novo: "Codigo do Cliente\n9043002"
  const matchNovo = texto.match(/C[oó]digo\s+do\s+[Cc]liente\s+(\d{4,})/i);
  if (matchNovo) return matchNovo[1];

  // Layout BOVESPA/antigo: "Código cliente ... 3-5  9043002"
  const matchAntigo = texto.match(/C[oó]digo\s+[Cc]liente[\s\S]{0,80}?\d+\s*-\s*\d+\s+(\d{4,})/i);
  if (matchAntigo) return matchAntigo[1];

  // Fallback genérico
  const matchGenerico = texto.match(/C[oó]digo\s+(?:do\s+)?[Cc]liente\s+(\d{4,})/i);
  if (matchGenerico) return matchGenerico[1];

  return null;
}

// ─── Parser principal ─────────────────────────────────────────────────────────
export function extrairDadosXP(textoOriginal: string): DadosXP {
  console.log("==== TEXTO BRUTO ====");
  console.log(textoOriginal);
  console.log("==== FIM TEXTO ====");

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
    tipoNota: null,
  };

  if (!textoOriginal || typeof textoOriginal !== "string") return dados;

  const paginas = textoOriginal
    .split("\f")
    .map(limparTexto)
    .filter((p) => p.length > 0);

  const paginasFinais = paginas.length > 0 ? paginas : [limparTexto(textoOriginal)];

  // ─── Detecta tipo por página (suporta notas híbridas) ───────────────────────
  const tiposPorPagina = paginasFinais.map(detectarTipoPagina);
  const temBMF     = tiposPorPagina.includes("BMF");
  const temBOVESPA = tiposPorPagina.includes("BOVESPA");
  dados.tipoNota = temBMF && temBOVESPA ? "HIBRIDA" : temBMF ? "BMF" : "BOVESPA";

  const primeiraPagina = paginasFinais[0];

  // ─── Número da nota ──────────────────────────────────────────────────────────
  {
    const match = primeiraPagina.match(/Nr\.?\s*nota\s+(\d+(?:\.\d+)*)/i);
    if (match) dados.numeroNota = match[1].replace(/\./g, "");
  }

  // ─── Data pregão ─────────────────────────────────────────────────────────────
  {
    const match = primeiraPagina.match(/Data\s+preg[aã]o\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) dados.dataPregao = match[1];
  }

  // ─── Código do cliente — busca em todas as páginas ───────────────────────────
  for (const pagina of paginasFinais) {
    const cod = extrairCodigoCliente(pagina);
    if (cod) {
      dados.cliente = cod;
      break;
    }
  }

  // ─── Financeiro — cada página com seu parser correto ────────────────────────
  for (let i = 0; i < paginasFinais.length; i++) {
    const pagina = paginasFinais[i];
    const tipo   = tiposPorPagina[i];

    if (tipo === "BOVESPA") {
      extrairFinanceiroBovespa(pagina, dados);
    } else {
      extrairFinanceiroBMF(pagina, dados);
    }
  }

  // ─── Sinal final consolidado (se híbrida, o sinal maior prevalece) ──────────
  // O sinalLiquido já foi preenchido pela última página que encontrou valor > 0.
  // Para notas híbridas, as duas notas têm líquidos independentes — somamos os
  // valores e mantemos o sinal do maior (já capturado no acumulador acima).

  dados.custos = Number((dados.taxaBmf + dados.taxaOperacional).toFixed(2));

  return dados;
}
