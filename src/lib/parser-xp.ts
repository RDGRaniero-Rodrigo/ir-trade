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
  tipoNota: "BMF" | "BOVESPA" | null; // ← novo campo
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

// ─── Detecta o tipo da nota ────────────────────────────────────────────────────
function detectarTipoNota(texto: string): "BMF" | "BOVESPA" {
  // Nota BM&F tem "Mercadoria" e "Vencimento" na tabela de negócios
  if (/Mercadoria\s+Vencimento/i.test(texto)) return "BMF";
  // Nota Bovespa tem "Especificação do título" e "FRACIONARIO" ou "BOVESPA"
  if (/Especifica[çc][aã]o\s+do\s+t[ií]tulo/i.test(texto)) return "BOVESPA";
  // Fallback: se tiver CBLC é Bovespa
  if (/CBLC|Clearing/i.test(texto)) return "BOVESPA";
  return "BMF";
}

// ─── Extração financeira BM&F (lógica original) ───────────────────────────────
function extrairFinanceiroBMF(texto: string, dados: DadosXP): void {
  // Valor dos negócios
  {
    const match = texto.match(
      /Valor\s+dos\s+neg[oó]cios\s+(?:\d{1,3}(?:\.\d{3})*,\d{2}\s+){4}(\d{1,3}(?:\.\d{3})*,\d{2})\s*[CD]?/i
    );
    if (match) {
      const val = parseNumeroBR(match[1]);
      if (val > 0) dados.valorNegocios = val;
    }
  }

  // Bloco das taxas
  {
    const match = texto.match(
      /IRRF\s+IRRF\s+Day\s+Trade(?:\s+\(proj\.\))?\s+Taxa\s+operacional\s+Taxa\s+registro\s+BM&F\s+Taxas\s+BM&F\s+\(emol\+f\.gar\)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      const irrfDayTrade    = parseNumeroBR(match[2]);
      const taxaOperacional = parseNumeroBR(match[3]);
      const taxaRegistro    = parseNumeroBR(match[4]);
      const taxaBmfEmol     = parseNumeroBR(match[5]);

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
        if (val > 0) {
          dados.totalLiquidoNota = val;
          dados.sinalLiquido = ultimoPar[2].toUpperCase() as "C" | "D";
        }
      }
    }
  }
}

// ─── Extração financeira Bovespa (lógica nova) ────────────────────────────────
function extrairFinanceiroBovespa(texto: string, dados: DadosXP): void {
  // Valor dos negócios = Vendas à vista + Compras à vista
  {
    const vendas  = texto.match(/Vendas\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const compras = texto.match(/Compras\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const valVendas  = vendas  ? parseNumeroBR(vendas[1])  : 0;
    const valCompras = compras ? parseNumeroBR(compras[1]) : 0;
    const total = valVendas + valCompras;
    if (total > 0) dados.valorNegocios = Number(total.toFixed(2));
  }

  // IRRF Day Trade — aparece como texto livre: "IRRF Day Trade: Base R$ 3,14 Projeção R$ 0,00"
  {
    const match = texto.match(
      /IRRF\s+Day\s+Trade[:\s]+Base\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+Proje[çc][aã]o\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      // Usa a projeção se > 0, senão a base
      const base     = parseNumeroBR(match[1]);
      const projecao = parseNumeroBR(match[2]);
      dados.irrf = projecao > 0 ? projecao : base;
    }
  }

  // Taxa Operacional (Custos Operacionais da seção Bovespa)
  {
    const match = texto.match(
      /Taxa\s+Operacional\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      dados.taxaOperacional = parseNumeroBR(match[1]);
    }
  }

  // taxaBmf = Emolumentos + Taxa de liquidação (equivalente Bovespa)
  {
    const emolumentos = texto.match(/Emolumentos\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const taxaLiq     = texto.match(/Taxa\s+de\s+liquida[çc][aã]o\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const valEmol  = emolumentos ? parseNumeroBR(emolumentos[1]) : 0;
    const valLiq   = taxaLiq    ? parseNumeroBR(taxaLiq[1])    : 0;
    const total = valEmol + valLiq;
    if (total > 0) dados.taxaBmf = Number(total.toFixed(2));
  }

  // Líquido para DD/MM/AAAA  →  equivalente ao "Total líquido da nota"
  {
    const match = texto.match(
      /L[ií]quido\s+para\s+\d{2}\/\d{2}\/\d{4}\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])/i
    );
    if (match) {
      const val = parseNumeroBR(match[1]);
      if (val > 0) {
        dados.totalLiquidoNota = val;
        dados.sinalLiquido = match[2].toUpperCase() as "C" | "D";
      }
    }
  }
}

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

  if (!textoOriginal || typeof textoOriginal !== "string") {
    return dados;
  }

  // ─── Divide o texto em páginas pelo separador \f ──────────────────────────
  const paginas = textoOriginal
    .split("\f")
    .map(limparTexto)
    .filter((p) => p.length > 0);

  const paginasFinais = paginas.length > 0 ? paginas : [limparTexto(textoOriginal)];
  const primeiraPagina = paginasFinais[0];

  // ─── Detecta tipo da nota ─────────────────────────────────────────────────
  dados.tipoNota = detectarTipoNota(primeiraPagina);

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
    // BM&F usa "Codigo do Cliente", Bovespa usa "Código cliente"
    const match = primeiraPagina.match(/C[oó]digo\s+(?:do\s+)?[Cc]liente\s*(?:\d-\s*)?(\d{4,})/i);
    if (match) dados.cliente = match[1];
  }

  // ─── Financeiro: chama o extrator correto para cada página ───────────────
  for (const pagina of paginasFinais) {
    if (dados.tipoNota === "BOVESPA") {
      extrairFinanceiroBovespa(pagina, dados);
    } else {
      extrairFinanceiroBMF(pagina, dados);
    }
  }

  // ─── Custos totais ────────────────────────────────────────────────────────
  dados.custos = Number((dados.taxaBmf + dados.taxaOperacional).toFixed(2));

  return dados;
}
