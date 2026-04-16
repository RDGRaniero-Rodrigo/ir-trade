// components/dashboard/UploadInline.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onClose: () => void;
  onUploadSuccess: () => void;
};

export function UploadInline({ onClose, onUploadSuccess }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "eml"].includes(ext ?? "")) {
      setErro("Apenas arquivos .pdf ou .eml são aceitos.");
      return;
    }
    setErro(null);
    setSucesso(false);
    setArquivo(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleLerArquivo = async () => {
    if (!arquivo) return;
    setProcessando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      // Adapte a rota para a sua API
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Erro ao processar arquivo.");
      }

      setSucesso(true);
      setArquivo(null);

      // Aguarda 1.5s e avisa o pai para recarregar os dados
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setProcessando(false);
    }
  };

  const handleLimpar = () => {
    setArquivo(null);
    setErro(null);
    setSucesso(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header do bloco */}
      <div className="flex items-center justify-between rounded-[12px] border border-slate-700 bg-[#061538] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Upload</p>
          <p className="mt-0.5 text-base font-bold text-white">Importar Nota</p>
          <p className="text-[11px] text-slate-400">
            Envie o arquivo PDF ou EML do mercado Forex / Internacional
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/50 hover:text-white"
          title="Fechar upload"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Área de drop */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed transition ${
          dragging
            ? "border-emerald-400 bg-emerald-500/10"
            : arquivo
            ? "border-emerald-500/50 bg-[#061538]"
            : "border-slate-700 bg-[#061538] hover:border-emerald-500/50 hover:bg-[#081733]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.eml"
          className="hidden"
          onChange={handleInputChange}
        />

        {sucesso ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">
              Arquivo importado com sucesso!
            </p>
            <p className="text-xs text-slate-400">Recarregando dados...</p>
          </>
        ) : arquivo ? (
          <>
            <FileText className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold text-white">{arquivo.name}</p>
            <p className="text-xs text-slate-400">
              {(arquivo.size / 1024).toFixed(1)} KB
            </p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-slate-500" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">
                Clique para selecionar ou arraste o arquivo aqui
              </p>
              <p className="text-xs text-slate-500">Arquivos .pdf ou .eml</p>
            </div>
          </>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-400">{erro}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          onClick={handleLerArquivo}
          disabled={!arquivo || processando || sucesso}
          className="h-9 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {processando ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Processando...
            </>
          ) : (
            "Ler Arquivo"
          )}
        </Button>
        <Button
          onClick={handleLimpar}
          disabled={processando}
          className="h-9 rounded-lg border border-slate-700 bg-transparent px-4 text-xs font-semibold text-slate-300 transition hover:bg-slate-700/50 disabled:opacity-50"
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
