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

function extrairHtmlDoEml(eml: string): string {
  const marker = "Content-Transfer-Encoding: base64";
  const idx = eml.indexOf(marker);

  if (idx === -1) return eml;

  const depois = eml.slice(idx + marker.length);
  const match = depois.match(/\r?\n\r?\n([\s\S]+)/);

  if (!match) return eml;

  const base64 = match[1].replace(/\r/g, "").replace(/\n/g, "").trim();
  const html = decodeBase64Utf8(base64);

  return html || eml;
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

  const ultimo = matches[matches.length - 1][1];
  return parseNumero(ultimo);
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

  const html = extrairHtmlDoEml(textoOriginal);
  const texto = limparTexto(stripTags(html));

  dados.conta = extrairCampo(texto, /A\/C\s*No:\s*([0-9]+)/i);
  dados.cliente = extrairCampo(texto, /Name:\s*(.+?)\s+Currency:/i);
  dados.moeda = extrairCampo(texto, /Currency:\s*([A-Z]{3})/i);
  dados.dataRelatorio =
    extrairCampo(texto, /(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2})/) ?? null;

  dados.ativoPrincipal = extrairAtivoPrincipal(texto);

  dados.saldoInicialUsd = parseNumero(
    extrairCampo(texto, /Previous\s+Ledger\s+Balance:\s*(-?\d+(\.\d+)?)/i)
  );

  dados.depositoRetiradaUsd = parseNumero(
    extrairCampo(texto, /Deposit\/Withdrawal:\s*(-?\d+(\.\d+)?)/i)
  );

  dados.resultadoDiaUsd = parseNumero(
    extrairCampo(texto, /Closed\s+Trade\s+P\/L:\s*(-?\d+(\.\d+)?)/i)
  );

  dados.floatingUsd = parseNumero(
    extrairCampo(texto, /Floating\s+P\/L:\s*(-?\d+(\.\d+)?)/i)
  );

  // 🔥 AGORA CORRETO
  dados.saldoFinalUsd = extrairUltimoValor(
    texto,
    /Balance:\s*(-?\d+(\.\d+)?)/gi
  );

  dados.equityFinalUsd = extrairUltimoValor(
    texto,
    /Equity:\s*(-?\d+(\.\d+)?)/gi
  );

  return dados;
}