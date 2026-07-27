import React from 'react';
import { Heart, Gift, Crown, Share2, Sparkles, UserCheck } from 'lucide-react';
import { EventInfo } from '../types';

interface HeaderNavProps {
  currentView: 'guest' | 'admin';
  onViewChange: (view: 'guest' | 'admin') => void;
  eventInfo: EventInfo;
  onCopyLink: () => void;
  copiedLink: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onViewChange,
  eventInfo,
  onCopyLink,
  copiedLink
}) => {
  return (
    <header className="no-print bg-[#F2ECE4]/90 backdrop-blur-md border-b border-[#E5DFD5] sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('guest')}>
            <div className="w-10 h-10 rounded-sm bg-[#C5A059] flex items-center justify-center text-white shadow-xs font-serif italic text-lg font-bold">
              {eventInfo.brideName?.[0] || 'H'}&{eventInfo.groomName?.[0] || 'R'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif text-lg font-bold text-[#2D2D2D] tracking-tight">
                  {eventInfo.eventTitle || 'Chá de Panela'}
                </h1>
                <span className="hidden sm:inline-block text-[#C5A059] text-[10px] font-semibold uppercase tracking-[0.2em] border-b border-[#C5A059]">
                  {eventInfo.brideName} & {eventInfo.groomName}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/60 hidden sm:block">
                Lista de Presentes & Confirmação
              </p>
            </div>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#FAF9F6] p-1 rounded-sm flex items-center space-x-1 border border-[#E5DFD5]">
              <button
                onClick={() => onViewChange('guest')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-2xs transition ${
                  currentView === 'guest'
                    ? 'bg-[#2D2D2D] text-white shadow-2xs'
                    : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D]'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Portal do Convidado</span>
              </button>

              <button
                onClick={() => onViewChange('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-2xs transition ${
                  currentView === 'admin'
                    ? 'bg-[#C5A059] text-white shadow-2xs'
                    : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D]'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-100" />
                <span>Painel da Noiva</span>
              </button>
            </div>

            {/* Share link button */}
            <button
              onClick={onCopyLink}
              title="Copiar Link para Convidados"
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D2D2D] bg-[#F2ECE4] hover:bg-[#FAF9F6] rounded-sm border border-[#E5DFD5] transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
