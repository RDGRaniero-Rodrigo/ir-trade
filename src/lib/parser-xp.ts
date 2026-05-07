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
  tipoNota: "BMF" | "BOVESPA" | null;
};

function parseNumeroBR(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function limparTexto(texto: string): string {
  return texto
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\|/g, " | ") // Preserva o pipe com espaços para facilitar regex
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Detecta o tipo da nota ────────────────────────────────────────────────────
function detectarTipoNota(texto: string): "BMF" | "BOVESPA" {
  if (/Mercadoria\s+Vencimento/i.test(texto)) return "BMF";
  if (/Especifica[çc][aã]o\s+do\s+t[ií]tulo/i.test(texto)) return "BOVESPA";
  if (/CBLC|Clearing/i.test(texto)) return "BOVESPA";
  return "BMF";
}

// ─── Extração financeira BM&F (lógica corrigida v2) ───────────────────────────
function extrairFinanceiroBMF(texto: string, dados: DadosXP): void {
  // ─── Valor dos negócios ─────────────────────────────────────────────────────
  // Formato: "Valor dos negócios 0,00   0,00   0,00   0,00   40,00 | C IRRF"
  {
    const match = texto.match(
      /Valor\s+dos\s+neg[oó]cios\s+([\d\s,\.]+?)\s*\|\s*([CD])\s*IRRF/i
    );
    if (match) {
      const numeros = match[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
      if (numeros && numeros.length > 0) {
        const ultimoValor = numeros[numeros.length - 1];
        const val = parseNumeroBR(ultimoValor);
        if (val > 0) dados.valorNegocios = val;
      }
    }
  }

  // ─── Bloco das taxas ────────────────────────────────────────────────────────
  // Formato: "IRRF   IRRF Day Trade (proj.)   Taxa operacional   Taxa registro BM&F   Taxas BM&F (emol+f.gar) 0,00|   0,39   0,00   0,32   0,18 | D"
  {
    const match = texto.match(
      /Taxas\s+BM&F\s*\(emol\+f\.gar\)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*\|?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      const irrf            = parseNumeroBR(match[1]); // IRRF (0,00)
      const irrfDayTrade    = parseNumeroBR(match[2]); // IRRF Day Trade (0,39)
      const taxaOperacional = parseNumeroBR(match[3]); // Taxa operacional (0,00)
      const taxaRegistro    = parseNumeroBR(match[4]); // Taxa registro BM&F (0,32)
      const taxaBmfEmol     = parseNumeroBR(match[5]); // Taxas BM&F emol+f.gar (0,18)

      dados.irrf            = irrfDayTrade;
      dados.taxaOperacional = taxaOperacional;
      dados.taxaBmf         = Number((taxaRegistro + taxaBmfEmol).toFixed(2));
    }
  }

  // ─── Total líquido da nota ──────────────────────────────────────────────────
  // Formato: "Total líquido da nota 0,00   0,00   0,00|   39,11 | C   39,50 | C   39,11 | C"
  {
    const match = texto.match(
      /Total\s+l[ií]quido\s+da\s+nota\s+([\s\S]*?)(?:\+Custos|Capitais|$)/i
    );
    if (match) {
      const trecho = match[1];
      const pares = [...trecho.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*\|?\s*([CD])/gi)];
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


// ─── Extração financeira Bovespa (mantida igual) ──────────────────────────────
function extrairFinanceiroBovespa(texto: string, dados: DadosXP): void {
  {
    const vendas  = texto.match(/Vendas\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const compras = texto.match(/Compras\s+[aà]\s+vista\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const valVendas  = vendas  ? parseNumeroBR(vendas[1])  : 0;
    const valCompras = compras ? parseNumeroBR(compras[1]) : 0;
    const total = valVendas + valCompras;
    if (total > 0) dados.valorNegocios = Number(total.toFixed(2));
  }

  {
    const match = texto.match(
      /IRRF\s+Day\s+Trade[:\s]+Base\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s+Proje[çc][aã]o\s+R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      const base     = parseNumeroBR(match[1]);
      const projecao = parseNumeroBR(match[2]);
      dados.irrf = projecao > 0 ? projecao : base;
    }
  }

  {
    const match = texto.match(
      /Taxa\s+Operacional\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i
    );
    if (match) {
      dados.taxaOperacional = parseNumeroBR(match[1]);
    }
  }

  {
    const emolumentos = texto.match(/Emolumentos\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const taxaLiq     = texto.match(/Taxa\s+de\s+liquida[çc][aã]o\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const valEmol  = emolumentos ? parseNumeroBR(emolumentos[1]) : 0;
    const valLiq   = taxaLiq    ? parseNumeroBR(taxaLiq[1])    : 0;
    const total = valEmol + valLiq;
    if (total > 0) dados.taxaBmf = Number(total.toFixed(2));
  }

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

  const paginas = textoOriginal
    .split("\f")
    .map(limparTexto)
    .filter((p) => p.length > 0);

  const paginasFinais = paginas.length > 0 ? paginas : [limparTexto(textoOriginal)];
  const primeiraPagina = paginasFinais[0];

  dados.tipoNota = detectarTipoNota(primeiraPagina);

  // ─── Número da nota ─────────────────────────────────────────────────────────
  {
    const match = primeiraPagina.match(/Nr\.?\s*nota\s+(\d+(?:\.\d+)*)/i);
    if (match) dados.numeroNota = match[1].replace(/\./g, "");
  }

  // ─── Data pregão ────────────────────────────────────────────────────────────
  {
    const match = primeiraPagina.match(/Data\s+preg[aã]o\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) dados.dataPregao = match[1];
  }

  // ─── Código do cliente ──────────────────────────────────────────────────────
  {
    const match = primeiraPagina.match(/C[oó]digo\s+(?:do\s+)?[Cc]liente\s+(\d{4,})/i);
    if (match) dados.cliente = match[1];
  }

  // ─── Financeiro ─────────────────────────────────────────────────────────────
  for (const pagina of paginasFinais) {
    if (dados.tipoNota === "BOVESPA") {
      extrairFinanceiroBovespa(pagina, dados);
    } else {
      extrairFinanceiroBMF(pagina, dados);
    }
  }

  dados.custos = Number((dados.taxaBmf + dados.taxaOperacional).toFixed(2));

  return dados;
}
