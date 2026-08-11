import React from 'react';
import { Share2 } from 'lucide-react';
import { AppRoute, EventInfo, GuestAuthSession } from '../types';

interface HeaderNavProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  eventInfo: EventInfo;
  guestSession: GuestAuthSession | null;
  onCopyLink: () => void;
  copiedLink: boolean;
  availableGiftsCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onNavigate,
  eventInfo,
  onCopyLink,
  copiedLink,
}) => {
  return (
    <header className="no-print bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5DFD5] sticky top-0 z-40 shadow-2xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand / Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => onNavigate('home')}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#C5A059] flex items-center justify-center text-white shadow-md text-base font-extrabold group-hover:scale-105 transition-transform">
              {eventInfo.brideName?.[0] || 'C'}&{eventInfo.groomName?.[0] || 'N'}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#2D2D2D] tracking-tight leading-none">
                {eventInfo.eventTitle || 'Chá de Panela'}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] mt-0.5">
                {eventInfo.brideName} & {eventInfo.groomName}
              </p>
            </div>
          </div>

          {/* Share Link Button Only (No Navigation Menu Buttons) */}
          <button
            onClick={onCopyLink}
            title="Copiar Link do Evento"
            className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-[#2D2D2D] bg-white hover:bg-[#F2ECE4] rounded-xl border border-[#E5DFD5] shadow-2xs transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">{copiedLink ? 'Link Copiado!' : 'Compartilhar'}</span>
          </button>

        </div>
      </div>
    </header>
  );
};
