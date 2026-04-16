import DashboardUploadPage from "@/features/dashboard-upload/DashboardUploadPage";

type Props = {
  searchParams: { aba?: string };
};

export default function UploadPage({ searchParams }: Props) {
  const abasValidas = ["importar", "mensal", "anual", "notas"];
  const aba = abasValidas.includes(searchParams.aba ?? "")
    ? (searchParams.aba as "importar" | "mensal" | "anual" | "notas")
    : "importar";

  return <DashboardUploadPage abaInicial={aba} />;
}
