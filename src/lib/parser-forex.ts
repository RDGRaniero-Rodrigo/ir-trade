// lib/parser-forex.ts

export type DadosForex = {
  dataRelatorio: string | null;
  conta: string | null;
  cliente: string | null;
  moeda: string | null;
  ativoPrincipal: string | null;
  saldoInicialUsd: number;
  depositoRetiradaUsd: number;
  resultadoDiaUsd: number;
  saldoFinalUsd: number;
  equityFinalUsd: number;
  floatingUsd: number;
};

// ─── Utilitários ─────────────────────────────────────────────────────────────

function limparTexto(texto: string): string {
  return texto
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBase64Utf8(base64: string): string {
  try {
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumero(valor: string | null | undefined): number {
  if (!valor) return 0;
  const n = Number(valor.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function extrairCampo(texto: string, regex: RegExp): string | null {
  const match = texto.match(regex);
  return match ? match[1].trim() : null;
}

function extrairUltimoValor(texto: string, regex: RegExp): number {
  const matches = [...texto.matchAll(regex)];
  if (matches.length === 0) return 0;
  return parseNumero(matches[matches.length - 1][1]);
}

function extrairAtivoPrincipal(texto: string): string | null {
  const ativos = texto.match(
    /\b(XAUUSD|XAGUSD|BTCUSD|ETHUSD|EURUSD|GBPUSD|USDJPY|USDCAD|AUDUSD|NZDUSD)\b/gi
  );
  if (!ativos) return null;

  const contagem: Record<string, number> = {};
  for (const a of ativos) {
    const key = a.toUpperCase();
    contagem[key] = (contagem[key] || 0) + 1;
  }
  return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Extratores de texto do EML ───────────────────────────────────────────────

/**
 * Tenta extrair todas as partes base64 do EML e decodificá-las.
 * Retorna o texto mais longo encontrado (geralmente o HTML do corpo).
 */
function extrairTextosBase64DoEml(eml: string): string[] {
  const resultados: string[] = [];
  const marker = "Content-Transfer-Encoding: base64";
  let pos = 0;

  while (true) {
    const idx = eml.indexOf(marker, pos);
    if (idx === -1) break;

    const depois = eml.slice(idx + marker.length);
    const match = depois.match(/\r?\n\r?\n([\s\S]+?)(?:\r?\n--|\r?\n\r?\nContent-|$)/);

    if (match) {
      const base64 = match[1].replace(/\r/g, "").replace(/\n/g, "").trim();
      const decoded = decodeBase64Utf8(base64);
      if (decoded.length > 50) resultados.push(decoded);
    }

    pos = idx + marker.length;
  }

  return resultados;
}

/**
 * Detecta se o texto parece HTML
 */
function ehHtml(texto: string): boolean {
  return /<html|<body|<table|<td|<tr/i.test(texto);
}

/**
 * Processa o EML e retorna o melhor texto plano extraído
 */
function processarEml(eml: string): string {
  // 1. Tenta decodificar todas as partes base64
  const partes = extrairTextosBase64DoEml(eml);

  if (partes.length > 0) {
    // Prioriza a parte HTML (maior e com tags)
    const htmlParte = partes.find(ehHtml) ?? partes.sort((a, b) => b.length - a.length)[0];
    return limparTexto(stripTags(htmlParte));
  }

  // 2. Fallback: o EML pode ser quoted-printable ou texto puro
  // Remove cabeçalhos MIME e tenta usar o corpo direto
  const semCabecalho = eml.replace(/^[\s\S]*?\r?\n\r?\n/, "");
  const textoLimpo = ehHtml(semCabecalho)
    ? limparTexto(stripTags(semCabecalho))
    : limparTexto(semCabecalho);

  return textoLimpo;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function extrairDadosForex(textoOriginal: string): DadosForex {
  const dados: DadosForex = {
    dataRelatorio: null,
    conta: null,
    cliente: null,
    moeda: null,
    ativoPrincipal: null,
    saldoInicialUsd: 0,
    depositoRetiradaUsd: 0,
    resultadoDiaUsd: 0,
    saldoFinalUsd: 0,
    equityFinalUsd: 0,
    floatingUsd: 0,
  };

  if (!textoOriginal) return dados;

  // ── Detecta tipo de arquivo e extrai texto ──
  const ehEml = textoOriginal.includes("Content-Transfer-Encoding")
    || textoOriginal.includes("MIME-Version")
    || textoOriginal.includes("Content-Type: text/html");

  const texto = ehEml
    ? processarEml(textoOriginal)
    : limparTexto(ehHtml(textoOriginal) ? stripTags(textoOriginal) : textoOriginal);

  // ── Log de debug (remover em produção) ──
  if (process.env.NODE_ENV === "development") {
    console.log("[parser-forex] Texto extraído (primeiros 500 chars):", texto.slice(0, 500));
  }

  // ── Extração dos campos ──

  // A/C No: 50090982
  dados.conta = extrairCampo(texto, /A\/C\s*No[:\s]+([0-9]+)/i);

  // Name: Rodrigo Antonio De Oliveira  (antes de "Currency:")
  dados.cliente = extrairCampo(texto, /Name[:\s]+(.+?)\s+Currency:/i);

  // Currency: USD
  dados.moeda = extrairCampo(texto, /Currency[:\s]+([A-Z]{3})/i);

  // Data: 2026.04.24 23:59
  dados.dataRelatorio =
    extrairCampo(texto, /(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})/) ?? null;

  // Ativo principal (mais frequente nas operações)
  dados.ativoPrincipal = extrairAtivoPrincipal(texto);

  // Previous Ledger Balance: 111.83
  dados.saldoInicialUsd = parseNumero(
    extrairCampo(texto, /Previous\s+Ledger\s+Balance[:\s]+(-?[\d,]+\.?\d*)/i)
  );

  // Deposit/Withdrawal: 0.00
  dados.depositoRetiradaUsd = parseNumero(
    extrairCampo(texto, /Deposit\s*\/\s*Withdrawal[:\s]+(-?[\d,]+\.?\d*)/i)
  );

  // Closed Trade P/L: -6.27
  dados.resultadoDiaUsd = parseNumero(
    extrairCampo(texto, /Closed\s+Trade\s+P\/L[:\s]+(-?[\d,]+\.?\d*)/i)
  );

  // Floating P/L: 0.00  ← pega o último (seção A/C Summary)
  dados.floatingUsd = extrairUltimoValor(
    texto,
    /Floating\s+P\/L[:\s]+(-?[\d,]+\.?\d*)/gi
  );

  // Balance: 105.56  ← pega o último (seção A/C Summary)
  dados.saldoFinalUsd = extrairUltimoValor(
    texto,
    /(?<!\w)Balance[:\s]+(-?[\d,]+\.?\d*)/gi
  );

  // Equity: 105.56  ← pega o último (seção A/C Summary)
  dados.equityFinalUsd = extrairUltimoValor(
    texto,
    /(?<!\w)Equity[:\s]+(-?[\d,]+\.?\d*)/gi
  );

  return dados;
}
