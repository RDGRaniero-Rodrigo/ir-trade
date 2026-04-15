"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const itensMenu = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/upload",
    label: "Upload PDF",
    icon: Upload,
  },
  {
    href: "/dashboard/notas",
    label: "Notas",
    icon: FileText,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  return (
    <>
      {/* Overlay escuro no mobile quando sidebar está aberta */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] flex-col 
          border-r border-slate-800 bg-[#08142f] text-white
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <span className="text-lg font-bold text-white">↗</span>
            </div>
            <p className="text-xl font-bold">IR Trade</p>
          </div>
          
          {/* Botão fechar - só aparece no mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu de navegação */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-2">
            {itensMenu.map((item) => {
              const ativo =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icone = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose} // Fecha sidebar ao clicar no mobile
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition ${
                    ativo
                      ? "bg-[#0c3844] text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-slate-300 hover:bg-[#0d1d44] hover:text-white"
                  }`}
                >
                  <Icone className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Botão Sair */}
        <div className="border-t border-slate-800 px-4 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-[#0d1d44] hover:text-white"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-base flex-shrink-0">
              N
            </div>
            <span className="text-[15px] font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
