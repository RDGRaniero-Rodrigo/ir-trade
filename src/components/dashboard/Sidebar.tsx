"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Upload, FileText } from "lucide-react";
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

export default function Sidebar() {
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
    <aside className="flex h-screen w-[310px] flex-col border-r border-slate-800 bg-[#08142f] text-white">
      <div className="flex items-center gap-4 border-b border-slate-800 px-7 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500">
          <span className="text-xl font-bold text-white">↗</span>
        </div>
        <div>
          <p className="text-2xl font-bold">IR Trade</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6">
        <div className="space-y-3">
          {itensMenu.map((item) => {
            const ativo =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icone = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-medium transition ${
                  ativo
                    ? "bg-[#0c3844] text-emerald-400 ring-1 ring-emerald-500/30"
                    : "text-slate-300 hover:bg-[#0d1d44] hover:text-white"
                }`}
              >
                <Icone className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-800 px-4 py-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left text-slate-300 transition hover:bg-[#0d1d44] hover:text-white"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-lg">
            N
          </div>
          <span className="text-[15px] font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}