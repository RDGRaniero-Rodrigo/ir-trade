"use client";

import {
  salvarNotaB3,
  salvarNotaForex,
  listarNotasB3,
  listarNotasForex,
  excluirNotaB3,
  excluirNotaForex,
  type NotaB3Banco,
  type NotaForexBanco,
} from "@/lib/supabase/notas";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropzonePDF } from "@/components/upload/DropzonePDF";
import {
  calcularFechamentosMensaisForex,
  type ResumoMensalForex as ResumoMensalForexCalculado,
} from "@/lib/calculo-forex";
import { extrairDadosForex } from "@/lib/parser-forex";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Trash2,
  ExternalLink,
  FileText,
  CalendarDays,
  Receipt,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { extrairTextoDoPDF } from "@/lib/pdf-reader";
import { extrairDadosXP } from "@/lib/parser-xp";
import { validarNotaXP } from "@/lib/validar-nota-xp";

type Status = "idle" | "processing" | "preview" | "success" | "duplicate";
type AbaAtiva = "importar" | "mensal" | "anual" | "notas";
type MercadoSelecionado = "b3" | "forex";

type DadosXP = {
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

type DadosForex = {
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

type NotaSalva = {
  id: string;
  numeroNota: string;
  dataPregao: string;
  cliente: string;
  valorNegocios: number;
  irrf: number;
  custos: number;
  valorLiquido: number;
  sinalLiquido: "C" | "D" | null;
  createdAt: string;
};

type NotaForexSalva = {
  id: string;
  dataRelatorio: string;
  conta: string;
  cliente: string;
  moeda: string;
  ativoPrincipal: string | null;
  saldoInicialUsd: number;
  depositoRetiradaUsd: number;
  resultadoDiaUsd: number;
  saldoFinalUsd: number;
  equityFinalUsd: number;
  floatingUsd: number;
  createdAt: string;
};

type ResumoMensalBase = {
  chave: string;
  ano: number;
  mes: number;
  label: string;
  quantidade: number;
  valorNegocios: number;
  custos: number;
  irrf: number;
  liquido: number;
};

type StatusMensal =
  | "Lucro com imposto"
  | "Lucro sem imposto"
  | "Prejuízo no mês"
  | "Zerado";

type StatusDarf =
  | "Preencher DARF"
  | "Aguardar acumular"
  | "Sem DARF no mês";

type ResumoMensal = ResumoMensalBase & {
  prejuizoAcumuladoAnterior: number;
  baseTributavel: number;
  impostoEstimado: number;
  impostoAPagar: number;
  prejuizoAcumuladoFinal: number;
  statusFechamento: StatusMensal;
  statusDarf: StatusDarf;
  periodoApuracao: string;
  vencimentoDarf: string;
  codigoReceita: string;
};

type ResumoAnual = {
  ano: number;
  quantidade: number;
  valorNegocios: number;
  custos: number;
  irrf: number;
  liquido: number;
};

type ResumoAnualForex = {
  ano: number;
  quantidadeMeses: number;
  quantidadeRelatorios: number;
  resultadoUsd: number;
  depositoRetiradaUsd: number;
  resultadoBrl: number;
  impostoEstimado: number;
  darfPagar: number;
};

const STORAGE_KEY_CONFIG = "irtrade_configuracoes_corretora";

const ALIQUOTA_DAY_TRADE = 0.2;
const CODIGO_DARF = "6015";
const CODIGO_DARF_FOREX = "8523";
const VALOR_MINIMO_DARF = 10;
const SICALC_URL = "https://sicalc.receita.fazenda.gov.br/sicalc/principal";

const NOMES_MESES = [
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

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarNumeroUsd(valor: number) {
  return valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarData(data: string) {
  return data || "-";
}

function round2(valor: number) {
  return Number(valor.toFixed(2));
}

function parseDataPregao(data: string) {
  const [dia, mes, ano] = data.split("/").map(Number);
  return { dia, mes, ano };
}

function normalizarDataForexParaCalculo(dataRelatorio: string) {
  const match = dataRelatorio.match(/^(\d{4})\.(\d{2})\.(\d{2})/);

  if (!match) return "";

  const ano = match[1];
  const mes = match[2];
  const dia = match[3];

  return `${ano}-${mes}-${dia}`;
}

function formatarDataForexParaExibicao(dataRelatorio: string) {
  const match = dataRelatorio.match(
    /^(\d{4})\.(\d{2})\.(\d{2})(?:\s+(\d{2}:\d{2}))?$/
  );

  if (!match) return dataRelatorio;

  const ano = match[1];
  const mes = match[2];
  const dia = match[3];
  const hora = match[4] || "";

  return hora ? `${dia}/${mes}/${ano} ${hora}` : `${dia}/${mes}/${ano}`;
}

function getLiquidoAssinado(nota: NotaSalva) {
  return nota.sinalLiquido === "D" ? -nota.valorLiquido : nota.valorLiquido;
}

function getPeriodoApuracao(mes: number, ano: number) {
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function getUltimoDiaUtilMesSeguinte(mes: number, ano: number) {
  const ultimoDiaMesSeguinte = new Date(ano, mes + 1, 0);

  while (
    ultimoDiaMesSeguinte.getDay() === 0 ||
    ultimoDiaMesSeguinte.getDay() === 6
  ) {
    ultimoDiaMesSeguinte.setDate(ultimoDiaMesSeguinte.getDate() - 1);
  }

  const dia = String(ultimoDiaMesSeguinte.getDate()).padStart(2, "0");
  const mesFmt = String(ultimoDiaMesSeguinte.getMonth() + 1).padStart(2, "0");
  const anoFmt = ultimoDiaMesSeguinte.getFullYear();

  return `${dia}/${mesFmt}/${anoFmt}`;
}

function DarfMensagem({ mes }: { mes: ResumoMensal }) {
  if (mes.statusDarf === "Preencher DARF") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        Existe imposto a recolher neste mês. Use os dados abaixo para preencher
        a DARF.
      </div>
    );
  }

  if (mes.statusDarf === "Aguardar acumular") {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
        O imposto apurado ficou abaixo de {formatarMoeda(VALOR_MINIMO_DARF)}.
        Aguarde acumular com os próximos meses antes do recolhimento.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0c1d45] p-3 text-sm text-slate-300">
      Não há DARF a recolher neste mês.
    </div>
  );
}

function CardResumoValor({
  titulo,
  valor,
  destaque = "normal",
}: {
  titulo: string;
  valor: string;
  destaque?: "normal" | "positivo" | "negativo" | "alerta";
}) {
  const cor =
    destaque === "positivo"
      ? "text-emerald-400"
      : destaque === "negativo"
      ? "text-red-400"
      : destaque === "alerta"
      ? "text-yellow-400"
      : "text-white";

  return (
    <div className="rounded-[16px] bg-[#0c1d45] p-4">
      <p className="text-xs text-slate-300 md:text-sm">{titulo}</p>
      <p className={`mt-2 text-lg font-semibold md:text-xl ${cor}`}>{valor}</p>
    </div>
  );
}

function mapNotaB3BancoParaLocal(nota: NotaB3Banco): NotaSalva {
  const dataPregaoFormatada = nota.data_pregao
    ? (() => {
        const [ano, mes, dia] = nota.data_pregao.split("-");
        return `${dia}/${mes}/${ano}`;
      })()
    : "";

  return {
    id: nota.id,
    numeroNota: nota.numero_nota ?? "",
    dataPregao: dataPregaoFormatada,
    cliente: nota.cliente ?? "",
    valorNegocios: Number(nota.valor_negocios ?? 0),
    irrf: Number(nota.irrf ?? 0),
    custos: Number(nota.custos ?? 0),
    valorLiquido: Number(nota.valor_liquido ?? 0),
    sinalLiquido: nota.sinal_liquido,
    createdAt: nota.created_at,
  };
}

function mapNotaForexBancoParaLocal(nota: NotaForexBanco): NotaForexSalva {
  return {
    id: nota.id,
    dataRelatorio: nota.data_relatorio ?? "",
    conta: nota.conta ?? "",
    cliente: nota.cliente ?? "",
    moeda: nota.moeda ?? "",
    ativoPrincipal: nota.ativo_principal,
    saldoInicialUsd: Number(nota.saldo_inicial_usd ?? 0),
    depositoRetiradaUsd: Number(nota.deposito_retirada_usd ?? 0),
    resultadoDiaUsd: Number(nota.resultado_dia_usd ?? 0),
    saldoFinalUsd: Number(nota.saldo_final_usd ?? 0),
    equityFinalUsd: Number(nota.equity_final_usd ?? 0),
    floatingUsd: Number(nota.floating_usd ?? 0),
    createdAt: nota.created_at,
  };
}

export default function DashboardUploadPage() {
  const searchParams = useSearchParams();

  const [file, setFile] = useState<File | null>(null);
  const [senhaPdf, setSenhaPdf] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("importar");
  const [erro, setErro] = useState("");
  const [dadosExtraidosB3, setDadosExtraidosB3] = useState<DadosXP | null>(
    null
  );
  const [dadosExtraidosForex, setDadosExtraidosForex] =
    useState<DadosForex | null>(null);
  const [notasSalvas, setNotasSalvas] = useState<NotaSalva[]>([]);
  const [notasForexSalvas, setNotasForexSalvas] = useState<NotaForexSalva[]>(
    []
  );
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [alertasValidacao, setAlertasValidacao] = useState<string[]>([]);
  const [mercadoSelecionado, setMercadoSelecionado] =
    useState<MercadoSelecionado>("b3");
  const [resumosMensaisForex, setResumosMensaisForex] = useState<
    ResumoMensalForexCalculado[]
  >([]);
  const [indiceMesForexAtual, setIndiceMesForexAtual] = useState(0);
  const [carregandoResumoForex, setCarregandoResumoForex] = useState(false);

  useEffect(() => {
    const aba = searchParams.get("aba");

    if (
      aba === "importar" ||
      aba === "mensal" ||
      aba === "anual" ||
      aba === "notas"
    ) {
      setAbaAtiva(aba);
    } else {
      setAbaAtiva("importar");
    }
  }, [searchParams]);

  useEffect(() => {
  async function carregarDadosIniciais() {
    try {
      const [b3, forex] = await Promise.all([
        listarNotasB3(),
        listarNotasForex(),
      ]);

      setNotasSalvas(b3.map(mapNotaB3BancoParaLocal));
      setNotasForexSalvas(forex.map(mapNotaForexBancoParaLocal));
    } catch (error) {
      console.error("Erro ao carregar notas do banco:", error);
      setNotasSalvas([]);
      setNotasForexSalvas([]);
    }

    let config: { mercado?: string } = {};

    if (typeof window !== "undefined") {
      try {
        config = JSON.parse(
          localStorage.getItem(STORAGE_KEY_CONFIG) || "{}"
        );
      } catch {
        config = {};
      }
    }

    if (config.mercado === "forex") {
      setMercadoSelecionado("forex");
    } else {
      setMercadoSelecionado("b3");
    }
  }

  carregarDadosIniciais();
}, []);

  useEffect(() => {
    async function carregarResumoMensalForex() {
      if (notasForexSalvas.length === 0) {
        setResumosMensaisForex([]);
        setIndiceMesForexAtual(0);
        return;
      }

      try {
        setCarregandoResumoForex(true);

        const relatorios = notasForexSalvas.map((nota) => ({
          id: nota.id,
          data: normalizarDataForexParaCalculo(nota.dataRelatorio),
          saldoInicial: nota.saldoInicialUsd,
          resultadoDia: nota.resultadoDiaUsd,
          depositoRetirada: nota.depositoRetiradaUsd,
          saldoFinal: nota.saldoFinalUsd,
        }));

        const resultados = await calcularFechamentosMensaisForex(relatorios);
        setResumosMensaisForex(resultados);
        setIndiceMesForexAtual(0);
      } catch (error) {
        console.error(error);
        setResumosMensaisForex([]);
        setIndiceMesForexAtual(0);
      } finally {
        setCarregandoResumoForex(false);
      }
    }

    carregarResumoMensalForex();
  }, [notasForexSalvas]);

  const resumoMensalForexAtual =
    resumosMensaisForex[indiceMesForexAtual] || null;

  const resumoMensalBase = useMemo<ResumoMensalBase[]>(() => {
    const mapa = new Map<string, ResumoMensalBase>();

    for (const nota of notasSalvas) {
      const { mes, ano } = parseDataPregao(nota.dataPregao);
      const chave = `${ano}-${String(mes).padStart(2, "0")}`;

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          ano,
          mes,
          label: `${NOMES_MESES[mes - 1]}/${ano}`,
          quantidade: 0,
          valorNegocios: 0,
          custos: 0,
          irrf: 0,
          liquido: 0,
        });
      }

      const item = mapa.get(chave)!;
      item.quantidade += 1;
      item.valorNegocios += nota.valorNegocios;
      item.custos += nota.custos;
      item.irrf += nota.irrf;
      item.liquido += getLiquidoAssinado(nota);
    }

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        valorNegocios: round2(item.valorNegocios),
        custos: round2(item.custos),
        irrf: round2(item.irrf),
        liquido: round2(item.liquido),
      }))
      .sort((a, b) => {
        if (a.ano !== b.ano) return a.ano - b.ano;
        return a.mes - b.mes;
      });
  }, [notasSalvas]);

  const resumoMensal = useMemo<ResumoMensal[]>(() => {
    let prejuizoAcumulado = 0;

    const calculado = resumoMensalBase.map((item) => {
      const prejuizoAcumuladoAnterior = round2(prejuizoAcumulado);

      let baseTributavel = 0;
      let impostoEstimado = 0;
      let impostoAPagar = 0;
      let prejuizoAcumuladoFinal = prejuizoAcumuladoAnterior;
      let statusFechamento: StatusMensal = "Zerado";

      if (item.liquido < 0) {
        prejuizoAcumuladoFinal = round2(
          prejuizoAcumuladoAnterior + Math.abs(item.liquido)
        );
        statusFechamento = "Prejuízo no mês";
      } else if (item.liquido > 0) {
        baseTributavel = round2(
          Math.max(0, item.liquido - prejuizoAcumuladoAnterior)
        );
        impostoEstimado = round2(baseTributavel * ALIQUOTA_DAY_TRADE);
        impostoAPagar = round2(Math.max(0, impostoEstimado - item.irrf));
        prejuizoAcumuladoFinal = round2(
          Math.max(0, prejuizoAcumuladoAnterior - item.liquido)
        );
        statusFechamento =
          baseTributavel > 0 ? "Lucro com imposto" : "Lucro sem imposto";
      }

      prejuizoAcumulado = prejuizoAcumuladoFinal;

      let statusDarf: StatusDarf = "Sem DARF no mês";
      if (impostoAPagar >= VALOR_MINIMO_DARF) {
        statusDarf = "Preencher DARF";
      } else if (impostoAPagar > 0 && impostoAPagar < VALOR_MINIMO_DARF) {
        statusDarf = "Aguardar acumular";
      }

      return {
        ...item,
        prejuizoAcumuladoAnterior,
        baseTributavel,
        impostoEstimado,
        impostoAPagar,
        prejuizoAcumuladoFinal,
        statusFechamento,
        statusDarf,
        periodoApuracao: getPeriodoApuracao(item.mes, item.ano),
        vencimentoDarf: getUltimoDiaUtilMesSeguinte(item.mes, item.ano),
        codigoReceita: CODIGO_DARF,
      };
    });

    return calculado.sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
  }, [resumoMensalBase]);

  const resumoAnual = useMemo<ResumoAnual[]>(() => {
    const mapa = new Map<number, ResumoAnual>();

    for (const nota of notasSalvas) {
      const { ano } = parseDataPregao(nota.dataPregao);

      if (!mapa.has(ano)) {
        mapa.set(ano, {
          ano,
          quantidade: 0,
          valorNegocios: 0,
          custos: 0,
          irrf: 0,
          liquido: 0,
        });
      }

      const item = mapa.get(ano)!;
      item.quantidade += 1;
      item.valorNegocios += nota.valorNegocios;
      item.custos += nota.custos;
      item.irrf += nota.irrf;
      item.liquido += getLiquidoAssinado(nota);
    }

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        valorNegocios: round2(item.valorNegocios),
        custos: round2(item.custos),
        irrf: round2(item.irrf),
        liquido: round2(item.liquido),
      }))
      .sort((a, b) => b.ano - a.ano);
  }, [notasSalvas]);

  const resumoAnualForex = useMemo<ResumoAnualForex[]>(() => {
    const mapa = new Map<number, ResumoAnualForex>();

    for (const item of resumosMensaisForex) {
      if (!mapa.has(item.ano)) {
        mapa.set(item.ano, {
          ano: item.ano,
          quantidadeMeses: 0,
          quantidadeRelatorios: 0,
          resultadoUsd: 0,
          depositoRetiradaUsd: 0,
          resultadoBrl: 0,
          impostoEstimado: 0,
          darfPagar: 0,
        });
      }

      const anual = mapa.get(item.ano)!;
      anual.quantidadeMeses += 1;
      anual.quantidadeRelatorios += item.quantidadeRelatorios;
      anual.resultadoUsd += item.resultadoMesUSD;
      anual.depositoRetiradaUsd += item.depositoRetiradaUSD;
      anual.resultadoBrl += item.resultadoConvertidoBRL;
      anual.impostoEstimado += item.impostoEstimado;
      anual.darfPagar += item.darfPagar;
    }

    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        resultadoUsd: round2(item.resultadoUsd),
        depositoRetiradaUsd: round2(item.depositoRetiradaUsd),
        resultadoBrl: round2(item.resultadoBrl),
        impostoEstimado: round2(item.impostoEstimado),
        darfPagar: round2(item.darfPagar),
      }))
      .sort((a, b) => b.ano - a.ano);
  }, [resumosMensaisForex]);

  async function handleLerArquivo() {
    if (!file) {
      setErro("Selecione um arquivo.");
      return;
    }

    try {
      setErro("");
      setStatus("processing");
      setDadosExtraidosB3(null);
      setDadosExtraidosForex(null);
      setErrosValidacao([]);
      setAlertasValidacao([]);

      const config = JSON.parse(
        localStorage.getItem(STORAGE_KEY_CONFIG) || "{}"
      );

      const mercadoAtual: MercadoSelecionado =
        config.mercado === "forex" ? "forex" : "b3";

      if (mercadoAtual === "forex") {
        const nome = file.name.toLowerCase();
        const ehEml = file.type === "message/rfc822" || nome.endsWith(".eml");

        let textoArquivo = "";

        if (ehEml) {
          textoArquivo = await file.text();
        } else {
          textoArquivo = await extrairTextoDoPDF(file);
        }

        const dadosForex = extrairDadosForex(textoArquivo);

        const jaExisteForex = notasForexSalvas.some(
          (nota) =>
            nota.dataRelatorio === dadosForex.dataRelatorio &&
            nota.conta === dadosForex.conta
        );

        setDadosExtraidosForex(dadosForex);
        setStatus(jaExisteForex ? "duplicate" : "preview");
        setAbaAtiva("importar");
        return;
      }

      const textoPdf = await extrairTextoDoPDF(file, senhaPdf || undefined);
      const dadosB3 = extrairDadosXP(textoPdf);

      const resultadoValidacao = validarNotaXP(dadosB3);
      setErrosValidacao(resultadoValidacao.erros);
      setAlertasValidacao(resultadoValidacao.alertas);

      if (!resultadoValidacao.valido) {
        setErro(
          "Não foi possível validar a nota. Revise os campos identificados."
        );
        setStatus("idle");
        return;
      }

      const jaExiste = notasSalvas.some(
        (nota) =>
          nota.numeroNota === dadosB3.numeroNota &&
          nota.dataPregao === dadosB3.dataPregao
      );

      setDadosExtraidosB3(dadosB3);
      setStatus(jaExiste ? "duplicate" : "preview");
      setAbaAtiva("importar");
    } catch (error) {
      console.error(error);
      setErro(
        "Não foi possível ler o arquivo. Verifique o formato e tente novamente."
      );
      setStatus("idle");
    }
  }

  function handleLimpar() {
    setFile(null);
    setSenhaPdf("");
    setMostrarSenha(false);
    setStatus("idle");
    setErro("");
    setDadosExtraidosB3(null);
    setDadosExtraidosForex(null);
    setErrosValidacao([]);
    setAlertasValidacao([]);
  }

  async function handleConfirmarImportacao() {
    if (mercadoSelecionado === "forex") {
      if (!dadosExtraidosForex) return;

      if (
        !dadosExtraidosForex.dataRelatorio ||
        !dadosExtraidosForex.conta ||
        !dadosExtraidosForex.cliente ||
        !dadosExtraidosForex.moeda
      ) {
        setErro(
          "O relatório Forex não possui dados suficientes para ser salvo."
        );
        return;
      }

      const jaExisteForex = notasForexSalvas.some(
        (nota) =>
          nota.dataRelatorio === dadosExtraidosForex.dataRelatorio &&
          nota.conta === dadosExtraidosForex.conta
      );

      if (jaExisteForex) {
        setStatus("duplicate");
        setErro("Esse relatório Forex já foi importado anteriormente.");
        return;
      }

      try {
        await salvarNotaForex({
          dataRelatorio: dadosExtraidosForex.dataRelatorio,
          conta: dadosExtraidosForex.conta,
          cliente: dadosExtraidosForex.cliente,
          moeda: dadosExtraidosForex.moeda,
          ativoPrincipal: dadosExtraidosForex.ativoPrincipal,
          saldoInicialUsd: dadosExtraidosForex.saldoInicialUsd,
          depositoRetiradaUsd: dadosExtraidosForex.depositoRetiradaUsd,
          resultadoDiaUsd: dadosExtraidosForex.resultadoDiaUsd,
          saldoFinalUsd: dadosExtraidosForex.saldoFinalUsd,
          equityFinalUsd: dadosExtraidosForex.equityFinalUsd,
          floatingUsd: dadosExtraidosForex.floatingUsd,
        });

        const forexAtualizado = await listarNotasForex();

        const notasForexConvertidas = forexAtualizado.map((nota) => ({
          id: nota.id,
          dataRelatorio: nota.data_relatorio ?? "",
          conta: nota.conta ?? "",
          cliente: nota.cliente ?? "",
          moeda: nota.moeda ?? "",
          ativoPrincipal: nota.ativo_principal,
          saldoInicialUsd: Number(nota.saldo_inicial_usd ?? 0),
          depositoRetiradaUsd: Number(nota.deposito_retirada_usd ?? 0),
          resultadoDiaUsd: Number(nota.resultado_dia_usd ?? 0),
          saldoFinalUsd: Number(nota.saldo_final_usd ?? 0),
          equityFinalUsd: Number(nota.equity_final_usd ?? 0),
          floatingUsd: Number(nota.floating_usd ?? 0),
          createdAt: nota.created_at,
        }));

        setNotasForexSalvas(notasForexConvertidas);

        setStatus("success");
        setErro("");
        setFile(null);
        setSenhaPdf("");
        setMostrarSenha(false);
        setDadosExtraidosB3(null);
        setDadosExtraidosForex(null);
        setAbaAtiva("notas");
        return;
      } catch (error) {
        console.error(error);
        setErro("Não foi possível salvar o relatório Forex no banco.");
        return;
      }
    }

    if (!dadosExtraidosB3) return;

    setErrosValidacao([]);
    setAlertasValidacao([]);

    if (
      !dadosExtraidosB3.numeroNota ||
      !dadosExtraidosB3.dataPregao ||
      !dadosExtraidosB3.cliente
    ) {
      setErro("A nota não possui dados suficientes para ser salva.");
      return;
    }

    const jaExiste = notasSalvas.some(
      (nota) =>
        nota.numeroNota === dadosExtraidosB3.numeroNota &&
        nota.dataPregao === dadosExtraidosB3.dataPregao
    );

    if (jaExiste) {
      setStatus("duplicate");
      setErro("Essa nota já foi importada anteriormente.");
      return;
    }

    try {
      await salvarNotaB3({
        numeroNota: dadosExtraidosB3.numeroNota,
        dataPregao: dadosExtraidosB3.dataPregao,
        cliente: dadosExtraidosB3.cliente,
        valorNegocios: dadosExtraidosB3.valorNegocios,
        irrf: dadosExtraidosB3.irrf,
        custos: dadosExtraidosB3.custos,
        valorLiquido: dadosExtraidosB3.totalLiquidoNota,
        sinalLiquido: dadosExtraidosB3.sinalLiquido,
      });

      const b3Atualizado = await listarNotasB3();

      const notasB3Convertidas = b3Atualizado.map((nota) => {
        let dataPregao = "";

        if (nota.data_pregao) {
          const partes = nota.data_pregao.split("-");
          if (partes.length === 3) {
            const [ano, mes, dia] = partes;
            dataPregao = `${dia}/${mes}/${ano}`;
          }
        }

        return {
          id: nota.id,
          numeroNota: nota.numero_nota ?? "",
          dataPregao,
          cliente: nota.cliente ?? "",
          valorNegocios: Number(nota.valor_negocios ?? 0),
          irrf: Number(nota.irrf ?? 0),
          custos: Number(nota.custos ?? 0),
          valorLiquido: Number(nota.valor_liquido ?? 0),
          sinalLiquido: nota.sinal_liquido,
          createdAt: nota.created_at,
        };
      });

      setNotasSalvas(notasB3Convertidas);

      setStatus("success");
      setErro("");
      setFile(null);
      setSenhaPdf("");
      setMostrarSenha(false);
      setDadosExtraidosB3(null);
      setDadosExtraidosForex(null);
      setAbaAtiva("notas");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível salvar a nota B3 no banco.");
    }
  }

  async function handleExcluirNota(id: string) {
    try {
      setErro("");

      if (mercadoSelecionado === "forex") {
        await excluirNotaForex(id);
        const atualizado = await listarNotasForex();
        setNotasForexSalvas(atualizado.map(mapNotaForexBancoParaLocal));
        return;
      }

      await excluirNotaB3(id);
      const atualizado = await listarNotasB3();
      setNotasSalvas(atualizado.map(mapNotaB3BancoParaLocal));
    } catch (error) {
      console.error(error);
      setErro("Erro ao excluir nota.");
    }
  }

  return (
    <div className="min-h-screen bg-[#020b24] text-white">
      <div className="mx-auto max-w-7xl px-6 py-6 md:px-6 md:py-7 md:px-7">
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          <a
            href="/dashboard/upload"
            className={`inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition ${
              abaAtiva === "importar"
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            Importar Nota
          </a>

          <a
            href="/dashboard/upload?aba=mensal"
            className={`inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition ${
              abaAtiva === "mensal"
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            Resumo Mensal
          </a>

          <a
            href="/dashboard/upload?aba=anual"
            className={`inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition ${
              abaAtiva === "anual"
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            Resumo Anual
          </a>

          <a
            href="/dashboard/upload?aba=notas"
            className={`inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold transition ${
              abaAtiva === "notas"
                ? "bg-emerald-500 text-white"
                : "bg-[#0c1d45] text-slate-300 hover:bg-[#122552] hover:text-white"
            }`}
          >
            Notas Salvas
          </a>
        </div>

        {abaAtiva === "importar" && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Upload
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Upload de Nota
            </h1>
            <p className="mt-1 text-sm text-slate-300 md:text-base">
              {mercadoSelecionado === "b3"
                ? "Envie o PDF da nota de corretagem do mercado Brasil / B3"
                : "Envie o arquivo PDF ou EML do mercado Forex / Internacional"}
            </p>
          </div>
        )}

        {abaAtiva === "importar" && (
          <>
            <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
              <h2 className="text-xl font-semibold md:text-2xl">
                Selecionar arquivo
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                {mercadoSelecionado === "b3"
                  ? "Faça upload da nota em PDF e informe a senha, se existir."
                  : "Faça upload do arquivo do mercado Forex. Para EML não é necessária senha."}
              </p>

              <div className="mt-5">
                <DropzonePDF
                  onFileSelected={setFile}
                  mercado={mercadoSelecionado}
                />
              </div>

              {mercadoSelecionado === "b3" && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-white md:text-base">
                    Senha do PDF
                  </label>

                  <div className="relative">
                    <Input
                      type={mostrarSenha ? "text" : "password"}
                      value={senhaPdf}
                      onChange={(e) => setSenhaPdf(e.target.value)}
                      placeholder="Digite a senha do PDF"
                      className="h-10 rounded-lg border-slate-700 bg-[#0c1d45] pr-10 text-sm text-white"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                    >
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {erro && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>{erro}</span>
                </div>
              )}

              {errosValidacao.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  <p className="font-medium">Problemas encontrados:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {errosValidacao.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <Button
                  onClick={handleLerArquivo}
                  disabled={!file || status === "processing"}
                  className="h-10 rounded-lg bg-emerald-500 px-4 text-sm hover:bg-emerald-600"
                >
                  {status === "processing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Lendo arquivo...
                    </>
                  ) : (
                    "Ler Arquivo"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLimpar}
                  className="h-10 rounded-lg border-slate-600 bg-transparent px-4 text-sm text-white hover:bg-slate-800"
                >
                  Limpar
                </Button>
              </div>
            </div>

            {(status === "preview" || status === "duplicate") &&
              (dadosExtraidosB3 || dadosExtraidosForex) && (
                <div className="mt-6 rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
                  <h2 className="text-xl font-semibold md:text-2xl">
                    Confirmar Dados Extraídos
                  </h2>
                  <p className="mt-1 text-sm text-slate-300 md:text-base">
                    Verifique se os dados estão corretos antes de importar.
                  </p>

                  {status === "duplicate" && (
                    <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                      {mercadoSelecionado === "b3"
                        ? "Essa nota já foi importada anteriormente. Você pode conferir os dados abaixo, mas ela não será salva novamente."
                        : "Esse relatório Forex já foi importado anteriormente. Você pode conferir os dados abaixo, mas ele não será salvo novamente."}
                    </div>
                  )}

                  {alertasValidacao.length > 0 &&
                    mercadoSelecionado === "b3" && (
                      <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                        <p className="font-medium">Atenção na conferência:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {alertasValidacao.map((alerta, index) => (
                            <li key={index}>{alerta}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {mercadoSelecionado === "b3" && dadosExtraidosB3 && (
                    <>
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <CardResumoValor
                          titulo="Número da Nota"
                          valor={dadosExtraidosB3.numeroNota ?? "Não identificado"}
                        />
                        <CardResumoValor
                          titulo="Código Cliente"
                          valor={dadosExtraidosB3.cliente ?? "Não identificado"}
                        />
                        <CardResumoValor
                          titulo="Data do Pregão"
                          valor={dadosExtraidosB3.dataPregao ?? "Não identificado"}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <CardResumoValor
                          titulo="Valor dos Negócios"
                          valor={formatarMoeda(dadosExtraidosB3.valorNegocios)}
                        />
                        <CardResumoValor
                          titulo="IRRF (Dedo-duro)"
                          valor={formatarMoeda(dadosExtraidosB3.irrf)}
                          destaque="alerta"
                        />
                        <CardResumoValor
                          titulo="Custos"
                          valor={formatarMoeda(dadosExtraidosB3.custos)}
                          destaque="negativo"
                        />
                        <CardResumoValor
                          titulo="Valor Líquido"
                          valor={`${
                            dadosExtraidosB3.sinalLiquido === "D" ? "-" : ""
                          }${formatarMoeda(dadosExtraidosB3.totalLiquidoNota)}`}
                          destaque={
                            dadosExtraidosB3.sinalLiquido === "D"
                              ? "negativo"
                              : "positivo"
                          }
                        />
                      </div>
                    </>
                  )}

                  {mercadoSelecionado === "forex" && dadosExtraidosForex && (
                    <>
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <CardResumoValor
                          titulo="Conta"
                          valor={dadosExtraidosForex.conta ?? "Não identificada"}
                        />
                        <CardResumoValor
                          titulo="Cliente"
                          valor={dadosExtraidosForex.cliente ?? "Não identificado"}
                        />
                        <CardResumoValor
                          titulo="Data do relatório"
                          valor={
                            dadosExtraidosForex.dataRelatorio ??
                            "Não identificada"
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <CardResumoValor
                          titulo="Ativo principal"
                          valor={
                            dadosExtraidosForex.ativoPrincipal ??
                            "Não identificado"
                          }
                        />
                        <CardResumoValor
                          titulo="Moeda"
                          valor={dadosExtraidosForex.moeda ?? "Não identificada"}
                        />
                        <CardResumoValor
                          titulo="Saldo inicial (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.saldoInicialUsd
                          )}
                        />
                        <CardResumoValor
                          titulo="Depósito / Retirada (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.depositoRetiradaUsd
                          )}
                          destaque={
                            dadosExtraidosForex.depositoRetiradaUsd < 0
                              ? "negativo"
                              : dadosExtraidosForex.depositoRetiradaUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                        <CardResumoValor
                          titulo="Resultado do dia (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.resultadoDiaUsd
                          )}
                          destaque={
                            dadosExtraidosForex.resultadoDiaUsd < 0
                              ? "negativo"
                              : dadosExtraidosForex.resultadoDiaUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                        <CardResumoValor
                          titulo="Saldo final (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.saldoFinalUsd
                          )}
                        />
                        <CardResumoValor
                          titulo="Equity final (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.equityFinalUsd
                          )}
                        />
                        <CardResumoValor
                          titulo="Floating P/L (USD)"
                          valor={formatarNumeroUsd(
                            dadosExtraidosForex.floatingUsd
                          )}
                          destaque={
                            dadosExtraidosForex.floatingUsd < 0
                              ? "negativo"
                              : dadosExtraidosForex.floatingUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="mt-5 flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleLimpar}
                      className="h-10 rounded-lg border-slate-600 bg-transparent px-4 text-sm text-white hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>

                    {status !== "duplicate" && (
                      <Button
                        onClick={handleConfirmarImportacao}
                        className="h-10 rounded-lg bg-emerald-500 px-4 text-sm text-white hover:bg-emerald-600"
                      >
                        Confirmar Importação
                      </Button>
                    )}
                  </div>
                </div>
              )}

            {status === "success" && (
              <div className="mt-6 rounded-[20px] border border-slate-800 bg-[#061538] p-5">
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="rounded-full bg-emerald-500/10 p-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-base font-semibold md:text-lg">
                      Importação confirmada
                    </p>
                    <p className="text-sm text-slate-300">
                      {mercadoSelecionado === "b3"
                        ? "A nota foi salva com sucesso no banco."
                        : "O relatório Forex foi salvo com sucesso no banco."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {abaAtiva === "mensal" && mercadoSelecionado === "b3" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Fechamento Mensal
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                Resultado mensal detalhado com cálculo do imposto e
                preenchimento guiado da DARF.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {resumoMensal.length === 0 ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhuma nota salva ainda.
                </div>
              ) : (
                resumoMensal.map((mes) => (
                  <div
                    key={mes.chave}
                    className="rounded-[18px] border border-slate-700 bg-[#081733] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xl font-semibold">{mes.label}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {mes.quantidade} nota(s) importada(s)
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs text-slate-300 md:text-sm">
                          Resultado líquido do mês
                        </p>
                        <p
                          className={`text-xl font-bold md:text-2xl ${
                            mes.liquido < 0
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {mes.liquido < 0 ? "-" : ""}
                          {formatarMoeda(Math.abs(mes.liquido))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <CardResumoValor
                        titulo="Valor dos negócios"
                        valor={formatarMoeda(mes.valorNegocios)}
                      />
                      <CardResumoValor
                        titulo="Custos"
                        valor={formatarMoeda(mes.custos)}
                        destaque="negativo"
                      />
                      <CardResumoValor
                        titulo="IRRF já descontado (Dedo-duro)"
                        valor={formatarMoeda(mes.irrf)}
                        destaque="alerta"
                      />
                      <CardResumoValor
                        titulo="Prejuízo acumulado anterior"
                        valor={formatarMoeda(mes.prejuizoAcumuladoAnterior)}
                        destaque="negativo"
                      />
                      <CardResumoValor
                        titulo="Lucro tributável do mês"
                        valor={formatarMoeda(mes.baseTributavel)}
                      />
                      <CardResumoValor
                        titulo="Prejuízo acumulado final"
                        valor={formatarMoeda(mes.prejuizoAcumuladoFinal)}
                        destaque={
                          mes.prejuizoAcumuladoFinal > 0
                            ? "negativo"
                            : "normal"
                        }
                      />
                      <CardResumoValor
                        titulo="Imposto estimado (20%)"
                        valor={formatarMoeda(mes.impostoEstimado)}
                        destaque="alerta"
                      />
                      <CardResumoValor
                        titulo="Imposto a pagar"
                        valor={formatarMoeda(mes.impostoAPagar)}
                        destaque={
                          mes.impostoAPagar > 0 ? "positivo" : "normal"
                        }
                      />
                      <CardResumoValor
                        titulo="Notas"
                        valor={String(mes.quantidade)}
                      />
                    </div>

                    <div className="mt-4">
                      <DarfMensagem mes={mes} />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div className="rounded-[18px] border border-slate-700 bg-[#09152f] p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-300">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              Modelo de preenchimento da DARF
                            </p>
                            <p className="text-xs text-slate-300 md:text-sm">
                              Use estes dados para preencher no sistema oficial.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-[#0c1d45] px-3 py-2.5">
                            <span className="text-xs text-slate-300 md:text-sm">
                              Código da receita
                            </span>
                            <span className="text-sm font-semibold md:text-base">
                              {mes.codigoReceita}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg bg-[#0c1d45] px-3 py-2.5">
                            <span className="text-xs text-slate-300 md:text-sm">
                              Período de apuração
                            </span>
                            <span className="text-sm font-semibold md:text-base">
                              {mes.periodoApuracao}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg bg-[#0c1d45] px-3 py-2.5">
                            <span className="text-xs text-slate-300 md:text-sm">
                              Vencimento
                            </span>
                            <span className="text-sm font-semibold md:text-base">
                              {mes.vencimentoDarf}
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                            <span className="text-xs text-emerald-200 md:text-sm">
                              Valor principal
                            </span>
                            <span className="text-sm font-bold text-emerald-300 md:text-base">
                              {formatarMoeda(mes.impostoAPagar)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            href={SICALC_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition hover:bg-emerald-600"
                          >
                            Abrir SicalcWeb
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-700 bg-[#09152f] p-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-violet-500/10 p-2 text-violet-300">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              Passo a passo para gerar a DARF
                            </p>
                            <p className="text-xs text-slate-300 md:text-sm">
                              Processo simples para o cliente preencher no site.
                            </p>
                          </div>
                        </div>

                        <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs text-slate-200 md:text-sm">
                          <li>Acesse o SicalcWeb pelo botão ao lado.</li>
                          <li>Entre na opção de preenchimento da DARF.</li>
                          <li>
                            Informe o código da receita{" "}
                            <strong>{mes.codigoReceita}</strong>.
                          </li>
                          <li>
                            Informe o período de apuração{" "}
                            <strong>{mes.periodoApuracao}</strong>.
                          </li>
                          <li>
                            Informe o valor principal de{" "}
                            <strong>{formatarMoeda(mes.impostoAPagar)}</strong>.
                          </li>
                          <li>Confira os dados pessoais do contribuinte.</li>
                          <li>Gere a DARF oficial no portal da Receita.</li>
                        </ol>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-lg bg-[#0c1d45] p-3">
                            <div className="flex items-center gap-2 text-cyan-300">
                              <CalendarDays className="h-4 w-4" />
                              <span className="text-xs md:text-sm">
                                Período
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold md:text-base">
                              {mes.periodoApuracao}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#0c1d45] p-3">
                            <div className="flex items-center gap-2 text-emerald-300">
                              <FileText className="h-4 w-4" />
                              <span className="text-xs md:text-sm">Valor</span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-emerald-400 md:text-base">
                              {formatarMoeda(mes.impostoAPagar)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {abaAtiva === "mensal" && mercadoSelecionado === "forex" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold md:text-2xl">
                  Fechamento Mensal Forex
                </h2>
                <p className="mt-1 text-sm text-slate-300 md:text-base">
                  Resultado mensal com cálculo do imposto do Forex e valor da
                  DARF.
                </p>
              </div>

              {!carregandoResumoForex && resumosMensaisForex.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setIndiceMesForexAtual((atual) => Math.max(0, atual - 1))
                    }
                    disabled={indiceMesForexAtual === 0}
                    className="h-10 rounded-lg border-slate-600 bg-transparent px-3 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="rounded-lg bg-[#0c1d45] px-4 py-2 text-sm text-white">
                    {indiceMesForexAtual + 1} de {resumosMensaisForex.length}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setIndiceMesForexAtual((atual) =>
                        Math.min(resumosMensaisForex.length - 1, atual + 1)
                      )
                    }
                    disabled={
                      indiceMesForexAtual === resumosMensaisForex.length - 1
                    }
                    className="h-10 rounded-lg border-slate-600 bg-transparent px-3 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              {carregandoResumoForex ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Carregando fechamento mensal do Forex...
                </div>
              ) : !resumoMensalForexAtual ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhum relatório Forex salvo ainda.
                </div>
              ) : (
                <div
                  key={resumoMensalForexAtual.chave}
                  className="rounded-[18px] border border-slate-700 bg-[#081733] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-semibold">
                        {resumoMensalForexAtual.mes}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {resumoMensalForexAtual.quantidadeRelatorios} relatório(s)
                        importado(s)
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-300 md:text-sm">
                        Resultado do mês (BRL)
                      </p>
                      <p
                        className={`text-xl font-bold md:text-2xl ${
                          resumoMensalForexAtual.resultadoConvertidoBRL < 0
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatarMoeda(
                          resumoMensalForexAtual.resultadoConvertidoBRL
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <CardResumoValor
                      titulo="Resultado do mês (USD)"
                      valor={formatarNumeroUsd(
                        resumoMensalForexAtual.resultadoMesUSD
                      )}
                      destaque={
                        resumoMensalForexAtual.resultadoMesUSD < 0
                          ? "negativo"
                          : resumoMensalForexAtual.resultadoMesUSD > 0
                          ? "positivo"
                          : "normal"
                      }
                    />
                    <CardResumoValor
                      titulo="Depósito / Retirada (USD)"
                      valor={formatarNumeroUsd(
                        resumoMensalForexAtual.depositoRetiradaUSD
                      )}
                      destaque={
                        resumoMensalForexAtual.depositoRetiradaUSD < 0
                          ? "negativo"
                          : resumoMensalForexAtual.depositoRetiradaUSD > 0
                          ? "positivo"
                          : "normal"
                      }
                    />
                    <CardResumoValor
                      titulo="Cotação média usada"
                      valor={resumoMensalForexAtual.cotacaoMedia.toFixed(4)}
                    />
                    <CardResumoValor
                      titulo="Resultado convertido (BRL)"
                      valor={formatarMoeda(
                        resumoMensalForexAtual.resultadoConvertidoBRL
                      )}
                      destaque={
                        resumoMensalForexAtual.resultadoConvertidoBRL < 0
                          ? "negativo"
                          : resumoMensalForexAtual.resultadoConvertidoBRL > 0
                          ? "positivo"
                          : "normal"
                      }
                    />
                    <CardResumoValor
                      titulo="Imposto estimado (15%)"
                      valor={formatarMoeda(
                        resumoMensalForexAtual.impostoEstimado
                      )}
                      destaque="alerta"
                    />
                    <CardResumoValor
                      titulo="DARF a pagar"
                      valor={formatarMoeda(resumoMensalForexAtual.darfPagar)}
                      destaque={
                        resumoMensalForexAtual.darfPagar > 0
                          ? "positivo"
                          : "normal"
                      }
                    />
                  </div>

                  <div className="mt-4">
                    {resumoMensalForexAtual.possuiImposto ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                        Existe imposto a recolher neste mês no Forex.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-700 bg-[#0c1d45] p-3 text-sm text-slate-300">
                        Não há DARF a recolher neste mês no Forex.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-[18px] border border-slate-700 bg-[#09152f] p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-300">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">
                            Modelo de preenchimento da DARF
                          </p>
                          <p className="text-xs text-slate-300 md:text-sm">
                            Use estes dados para preencher no sistema oficial.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between rounded-lg bg-[#0c1d45] px-3 py-2.5">
                          <span className="text-xs text-slate-300 md:text-sm">
                            Código da receita
                          </span>
                          <span className="text-sm font-semibold md:text-base">
                            {CODIGO_DARF_FOREX}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-[#0c1d45] px-3 py-2.5">
                          <span className="text-xs text-slate-300 md:text-sm">
                            Período de apuração
                          </span>
                          <span className="text-sm font-semibold md:text-base">
                            {String(resumoMensalForexAtual.mesNumero).padStart(
                              2,
                              "0"
                            )}
                            /{resumoMensalForexAtual.ano}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                          <span className="text-xs text-emerald-200 md:text-sm">
                            Valor principal
                          </span>
                          <span className="text-sm font-bold text-emerald-300 md:text-base">
                            {formatarMoeda(resumoMensalForexAtual.darfPagar)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={SICALC_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition hover:bg-emerald-600"
                        >
                          Abrir SicalcWeb
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-slate-700 bg-[#09152f] p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-violet-500/10 p-2 text-violet-300">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">
                            Passo a passo para gerar a DARF
                          </p>
                          <p className="text-xs text-slate-300 md:text-sm">
                            Processo simples para o cliente preencher no site.
                          </p>
                        </div>
                      </div>

                      <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs text-slate-200 md:text-sm">
                        <li>Acesse o SicalcWeb pelo botão ao lado.</li>
                        <li>Entre na opção de preenchimento da DARF.</li>
                        <li>
                          Informe o código da receita{" "}
                          <strong>{CODIGO_DARF_FOREX}</strong>.
                        </li>
                        <li>
                          Informe o período de apuração{" "}
                          <strong>
                            {String(resumoMensalForexAtual.mesNumero).padStart(
                              2,
                              "0"
                            )}
                            /{resumoMensalForexAtual.ano}
                          </strong>
                          .
                        </li>
                        <li>
                          Informe o valor principal{" "}
                          <strong>
                            {formatarMoeda(resumoMensalForexAtual.darfPagar)}
                          </strong>
                          .
                        </li>
                        <li>Confira os dados pessoais do contribuinte.</li>
                        <li>Gere a DARF oficial no portal da Receita.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === "anual" && mercadoSelecionado === "b3" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Resumo Anual
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                Consolidado anual das notas salvas.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {resumoAnual.length === 0 ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhuma nota salva ainda.
                </div>
              ) : (
                resumoAnual.map((ano) => (
                  <div
                    key={ano.ano}
                    className="rounded-[18px] border border-slate-700 bg-[#081733] p-4"
                  >
                    <div className="mb-4">
                      <p className="text-xl font-semibold">{ano.ano}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {ano.quantidade} nota(s) importada(s)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <CardResumoValor
                        titulo="Valor dos negócios"
                        valor={formatarMoeda(ano.valorNegocios)}
                      />
                      <CardResumoValor
                        titulo="Custos"
                        valor={formatarMoeda(ano.custos)}
                        destaque="negativo"
                      />
                      <CardResumoValor
                        titulo="IRRF"
                        valor={formatarMoeda(ano.irrf)}
                        destaque="alerta"
                      />
                      <CardResumoValor
                        titulo="Resultado líquido"
                        valor={formatarMoeda(ano.liquido)}
                        destaque={ano.liquido < 0 ? "negativo" : "positivo"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {abaAtiva === "anual" && mercadoSelecionado === "forex" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Resumo Anual Forex
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                Consolidado anual dos meses Forex calculados com PTAX.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {resumoAnualForex.length === 0 ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhum resumo anual Forex disponível ainda.
                </div>
              ) : (
                resumoAnualForex.map((ano) => (
                  <div
                    key={ano.ano}
                    className="rounded-[18px] border border-slate-700 bg-[#081733] p-4"
                  >
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xl font-semibold">{ano.ano}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {ano.quantidadeMeses} mês(es) com{" "}
                          {ano.quantidadeRelatorios} relatório(s)
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs text-slate-300 md:text-sm">
                          Resultado anual (BRL)
                        </p>
                        <p
                          className={`text-xl font-bold md:text-2xl ${
                            ano.resultadoBrl < 0
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {formatarMoeda(ano.resultadoBrl)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <CardResumoValor
                        titulo="Resultado anual (USD)"
                        valor={formatarNumeroUsd(ano.resultadoUsd)}
                        destaque={
                          ano.resultadoUsd < 0
                            ? "negativo"
                            : ano.resultadoUsd > 0
                            ? "positivo"
                            : "normal"
                        }
                      />
                      <CardResumoValor
                        titulo="Depósito / Retirada (USD)"
                        valor={formatarNumeroUsd(ano.depositoRetiradaUsd)}
                        destaque={
                          ano.depositoRetiradaUsd < 0
                            ? "negativo"
                            : ano.depositoRetiradaUsd > 0
                            ? "positivo"
                            : "normal"
                        }
                      />
                      <CardResumoValor
                        titulo="Resultado anual (BRL)"
                        valor={formatarMoeda(ano.resultadoBrl)}
                        destaque={
                          ano.resultadoBrl < 0
                            ? "negativo"
                            : ano.resultadoBrl > 0
                            ? "positivo"
                            : "normal"
                        }
                      />
                      <CardResumoValor
                        titulo="Imposto estimado"
                        valor={formatarMoeda(ano.impostoEstimado)}
                        destaque="alerta"
                      />
                      <CardResumoValor
                        titulo="DARF acumulada"
                        valor={formatarMoeda(ano.darfPagar)}
                        destaque={ano.darfPagar > 0 ? "positivo" : "normal"}
                      />
                      <CardResumoValor
                        titulo="Meses calculados"
                        valor={String(ano.quantidadeMeses)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {abaAtiva === "notas" && mercadoSelecionado === "b3" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Notas Salvas
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                Histórico das notas B3 salvas no banco.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {notasSalvas.length === 0 ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhuma nota salva ainda.
                </div>
              ) : (
                notasSalvas.map((nota) => (
                  <div
                    key={nota.id}
                    className="rounded-[16px] border border-slate-700 bg-[#081733] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <CardResumoValor
                          titulo="Número da nota"
                          valor={nota.numeroNota}
                        />
                        <CardResumoValor
                          titulo="Data do pregão"
                          valor={formatarData(nota.dataPregao)}
                        />
                        <CardResumoValor
                          titulo="Cliente"
                          valor={nota.cliente}
                        />
                        <CardResumoValor
                          titulo="Valor líquido"
                          valor={`${
                            nota.sinalLiquido === "D" ? "-" : ""
                          }${formatarMoeda(nota.valorLiquido)}`}
                          destaque={
                            nota.sinalLiquido === "D"
                              ? "negativo"
                              : "positivo"
                          }
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handleExcluirNota(nota.id)}
                        className="h-10 rounded-lg border-red-500/40 bg-transparent px-4 text-sm text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {abaAtiva === "notas" && mercadoSelecionado === "forex" && (
          <div className="rounded-[20px] border border-slate-800 bg-[#061538] p-4 md:p-5">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">
                Relatórios Forex Salvos
              </h2>
              <p className="mt-1 text-sm text-slate-300 md:text-base">
                Histórico dos relatórios Forex salvos no banco.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {notasForexSalvas.length === 0 ? (
                <div className="rounded-[16px] border border-slate-700 bg-[#081733] p-4 text-sm text-slate-300">
                  Nenhum relatório Forex salvo ainda.
                </div>
              ) : (
                notasForexSalvas.map((nota) => (
                  <div
                    key={nota.id}
                    className="rounded-[16px] border border-slate-700 bg-[#081733] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <CardResumoValor
                          titulo="Data do relatório"
                          valor={formatarDataForexParaExibicao(
                            nota.dataRelatorio
                          )}
                        />
                        <CardResumoValor titulo="Conta" valor={nota.conta} />
                        <CardResumoValor titulo="Cliente" valor={nota.cliente} />
                        <CardResumoValor
                          titulo="Resultado do dia (USD)"
                          valor={formatarNumeroUsd(nota.resultadoDiaUsd)}
                          destaque={
                            nota.resultadoDiaUsd < 0
                              ? "negativo"
                              : nota.resultadoDiaUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                        <CardResumoValor
                          titulo="Depósito / Retirada (USD)"
                          valor={formatarNumeroUsd(nota.depositoRetiradaUsd)}
                          destaque={
                            nota.depositoRetiradaUsd < 0
                              ? "negativo"
                              : nota.depositoRetiradaUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                        <CardResumoValor
                          titulo="Saldo final (USD)"
                          valor={formatarNumeroUsd(nota.saldoFinalUsd)}
                        />
                        <CardResumoValor
                          titulo="Equity final (USD)"
                          valor={formatarNumeroUsd(nota.equityFinalUsd)}
                        />
                        <CardResumoValor
                          titulo="Floating P/L (USD)"
                          valor={formatarNumeroUsd(nota.floatingUsd)}
                          destaque={
                            nota.floatingUsd < 0
                              ? "negativo"
                              : nota.floatingUsd > 0
                              ? "positivo"
                              : "normal"
                          }
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handleExcluirNota(nota.id)}
                        className="h-10 rounded-lg border-red-500/40 bg-transparent px-4 text-sm text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}