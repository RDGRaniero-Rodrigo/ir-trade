"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

type DropzonePDFProps = {
  onFileSelected: (file: File | null) => void;
  mercado?: "b3" | "forex";
};

export function DropzonePDF({
  onFileSelected,
  mercado = "b3",
}: DropzonePDFProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragAtivo, setDragAtivo] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  const aceitaPdf = mercado === "b3";
  const accept = aceitaPdf
    ? "application/pdf,.pdf"
    : "application/pdf,.pdf,message/rfc822,.eml";

  function selecionarArquivo(file: File | null) {
    if (!file) return;

    const nome = file.name.toLowerCase();
    const ehPdf = file.type === "application/pdf" || nome.endsWith(".pdf");
    const ehEml = file.type === "message/rfc822" || nome.endsWith(".eml");

    if (mercado === "b3" && !ehPdf) {
      alert("Selecione apenas arquivos PDF.");
      return;
    }

    if (mercado === "forex" && !ehPdf && !ehEml) {
      alert("Selecione apenas arquivos PDF ou EML.");
      return;
    }

    setArquivo(file);
    onFileSelected(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    selecionarArquivo(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragAtivo(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    selecionarArquivo(file);
  }

  function limparArquivo() {
    setArquivo(null);
    onFileSelected(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      {!arquivo ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragAtivo(true);
          }}
          onDragLeave={() => setDragAtivo(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed px-6 py-10 text-center transition ${
            dragAtivo
              ? "border-emerald-400 bg-emerald-500/5"
              : "border-slate-600 bg-[#0c1d45]"
          }`}
        >
          <div className="rounded-2xl bg-slate-500/10 p-3 text-slate-300">
            <UploadCloud className="h-8 w-8" />
          </div>

          <p className="mt-4 text-sm font-medium text-white md:text-base">
            Clique para selecionar ou arraste o arquivo aqui
          </p>

          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            {mercado === "b3" ? "Apenas arquivos .pdf" : "Arquivos .pdf ou .eml"}
          </p>
        </div>
      ) : (
        <div className="rounded-[18px] border border-slate-700 bg-[#0c1d45] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-2 text-red-300">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {arquivo.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={limparArquivo}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}