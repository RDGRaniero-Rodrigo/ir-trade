'use client';

import { useEffect, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [iniciais, setIniciais] = useState('?');

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (user) {
          const email = user.email ?? '';
          const nome =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email.split('@')[0] ||
            'Usuário';

          setEmailUsuario(email);
          setNomeUsuario(nome);

          const partes = nome.trim().split(' ');
          if (partes.length >= 2) {
            setIniciais((partes[0][0] + partes[1][0]).toUpperCase());
          } else {
            setIniciais(nome.slice(0, 2).toUpperCase());
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    }

    carregarUsuario();
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-slate-400 hover:text-white"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Bell className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white leading-tight">{nomeUsuario}</p>
              <p className="text-xs text-slate-400 leading-tight">{emailUsuario}</p>
            </div>
            <Avatar className="h-8 w-8 border-2 border-emerald-500">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                {iniciais}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
