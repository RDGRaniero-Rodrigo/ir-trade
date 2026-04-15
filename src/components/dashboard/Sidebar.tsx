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
      {/* Overlay escuro no mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen w-[200px] flex-col 
          border-r border-slate-800 bg-[#08142f] text-white
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:w-[180px]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <span className="text-sm font-bold text-white">↗</span>
            </div>
            <p className="text-base font-bold">IR Trade</p>
          </div>
          
          {/* Botão fechar - só no mobile */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Menu de navegação */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {itensMenu.map((item) => {
              const ativo =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icone = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    ativo
                      ? "bg-[#0c3844] text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-slate-300 hover:bg-[#0d1d44] hover:text-white"
                  }`}
                >
                  <Icone className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Botão Sair */}
        <div className="border-t border-slate-800 px-2 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-300 transition hover:bg-[#0d1d44] hover:text-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-xs flex-shrink-0">
              R
            </div>
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
