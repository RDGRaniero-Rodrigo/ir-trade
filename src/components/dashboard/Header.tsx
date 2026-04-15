'use client';

import { Bell, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Botão hambúrguer - só aparece no mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-slate-400 hover:text-white"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Espaço vazio no desktop */}
        <div className="hidden lg:block" />

        {/* Lado direito: notificações e avatar */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">Rodrigo</p>
              <p className="text-xs text-slate-400">rodrigo@email.com</p>
            </div>
            <Avatar className="h-9 w-9 border-2 border-emerald-500">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
                R
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
