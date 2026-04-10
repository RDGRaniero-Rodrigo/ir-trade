import { Suspense } from "react";
import DashboardUploadPage from "../../../features/dashboard-upload/DashboardUploadPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Carregando...</div>}>
      <DashboardUploadPage />
    </Suspense>
  );
}