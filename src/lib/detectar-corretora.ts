export type CorretoraDetectada = "XP" | "RICO" | "CLEAR" | "DESCONHECIDA"

export function detectarCorretora(texto: string): CorretoraDetectada {
  const t = texto.toLowerCase()

  if (t.includes("rico corretora")) return "RICO"
  if (t.includes("xp investimento") || t.includes("xp investimentos")) return "XP"
  if (t.includes("clear corretora")) return "CLEAR"

  return "DESCONHECIDA"
}