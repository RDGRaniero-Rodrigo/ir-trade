export async function extrairTextoDoPDF(file: File, senha?: string) {
  if (typeof window === "undefined") {
    throw new Error("PDF só pode ser processado no navegador");
  }

  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: senha || undefined,
  });

  const pdf = await loadingTask.promise;

  let textoCompleto = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();

    const textoPagina = conteudo.items
      .map((item: any) => item.str)
      .join(" ");

    textoCompleto += " " + textoPagina;
  }

  return textoCompleto;
}