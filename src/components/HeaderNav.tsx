import React, { useState } from 'react';
import { Share2, Home, Heart, Gift, User, Crown, Terminal, Menu, X, UserCheck, Sparkles, Check } from 'lucide-react';
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
  currentRoute,
  onNavigate,
  eventInfo,
  guestSession,
  onCopyLink,
  copiedLink,
  availableGiftsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loggedEmail = (guestSession?.email || '').toLowerCase();
  const isSuperAdmin = loggedEmail === 'euques@gmail.com' && typeof window !== 'undefined' && sessionStorage.getItem('cha_superadmin_authenticated') === 'true';
  const isCoupleAdmin = typeof window !== 'undefined' && sessionStorage.getItem('cha_couple_authenticated') === 'true';
  const isPlatformRoute = currentRoute === 'home' || currentRoute === 'login' || currentRoute === 'superadmin';

  const handleNavClick = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="no-print bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5DFD5] sticky top-0 z-50 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand / Logo */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group min-w-0 pr-2" 
            onClick={() => handleNavClick(isPlatformRoute ? 'home' : 'casal')}
          >
            {isPlatformRoute ? (
              <>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#2D2D2D] flex items-center justify-center text-[#C5A059] shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <Sparkles className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-base font-extrabold text-[#2D2D2D] tracking-tight leading-tight truncate">
                    Chá de Panela
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C5A059] truncate">
                    Plataforma de Eventos
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#C5A059] flex items-center justify-center text-white shadow-md text-sm sm:text-base font-extrabold group-hover:scale-105 transition-transform shrink-0">
                  {eventInfo.brideName?.[0] || 'P'}&{eventInfo.groomName?.[0] || 'M'}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-base font-extrabold text-[#2D2D2D] tracking-tight leading-tight truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">
                    {eventInfo.eventTitle || 'Chá de Panela'}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#C5A059] truncate max-w-[130px] xs:max-w-[190px] sm:max-w-none">
                    {eventInfo.brideName} & {eventInfo.groomName}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentRoute === 'home'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D]/75 hover:bg-[#F2ECE4] hover:text-[#2D2D2D]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </button>

            {!isPlatformRoute && (
              <>
                <button
                  onClick={() => handleNavClick('casal')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    currentRoute === 'casal'
                      ? 'bg-[#2D2D2D] text-white shadow-xs'
                      : 'text-[#2D2D2D]/75 hover:bg-[#F2ECE4] hover:text-[#2D2D2D]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                  <span>O Casal</span>
                </button>

                <button
                  onClick={() => handleNavClick('presentes')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer relative ${
                    currentRoute === 'presentes'
                      ? 'bg-[#2D2D2D] text-white shadow-xs'
                      : 'text-[#2D2D2D]/75 hover:bg-[#F2ECE4] hover:text-[#2D2D2D]'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Presentes</span>
                  {availableGiftsCount > 0 && (
                    <span className="ml-1 bg-[#C5A059] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {availableGiftsCount}
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              onClick={() => handleNavClick('login')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentRoute === 'login'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D]/75 hover:bg-[#F2ECE4] hover:text-[#2D2D2D]'
              }`}
            >
              {guestSession ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="truncate max-w-[100px]">{guestSession.name.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-[#2D2D2D]/60" />
                  <span>Entrar</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleNavClick('noiva')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentRoute === 'noiva'
                  ? 'bg-[#C5A059] text-white shadow-xs'
                  : isCoupleAdmin
                    ? 'bg-[#F2ECE4] text-[#C5A059] hover:bg-[#E5DFD5]'
                    : 'text-[#2D2D2D]/75 hover:bg-[#F2ECE4] hover:text-[#2D2D2D]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>Painel Noivos</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => handleNavClick('superadmin')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentRoute === 'superadmin'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#1E1E1E] text-amber-400 hover:bg-black'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>
            )}

          </nav>

          {/* Action Buttons (Right) */}
          <div className="flex items-center space-x-2">
            
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 text-[#2D2D2D] bg-white hover:bg-[#F2ECE4] rounded-xl border border-[#E5DFD5] shadow-2xs transition-all active:scale-95 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Abrir Menu de Navegação"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#2D2D2D]" />
              ) : (
                <Menu className="w-5 h-5 text-[#2D2D2D]" />
              )}
            </button>

          </div>

        </div>
      </div>

      {/* MOBILE MENU DRAWER / DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5DFD5] shadow-xl animate-fade-in divide-y divide-[#E5DFD5]/60">
          
          {/* Active Status Header in Mobile */}
          <div className="px-5 py-3.5 bg-[#FAF9F6] flex items-center justify-between text-xs">
            <span className="text-[#2D2D2D]/60 font-medium">Sessão Atual:</span>
            {isSuperAdmin ? (
              <span className="font-extrabold text-amber-600 flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Terminal className="w-3 h-3" />
                <span>Super Admin</span>
              </span>
            ) : isCoupleAdmin ? (
              <span className="font-extrabold text-[#C5A059] flex items-center space-x-1 bg-[#F2ECE4] px-2.5 py-1 rounded-full border border-[#E5DFD5]">
                <Crown className="w-3 h-3" />
                <span>Painel Noivos</span>
              </span>
            ) : guestSession ? (
              <span className="font-extrabold text-emerald-700 flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <UserCheck className="w-3 h-3" />
                <span>{guestSession.name}</span>
              </span>
            ) : (
              <span className="font-bold text-[#2D2D2D]/60">Visitante</span>
            )}
          </div>

          {/* Navigation Links List (Min 48px Touch Target) */}
          <div className="p-3 space-y-1.5">
            
            <button
              onClick={() => handleNavClick('home')}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                currentRoute === 'home'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D] hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Home className="w-4 h-4 text-[#C5A059]" />
                <span>Início (Todos os Chás)</span>
              </div>
            </button>

            {!isPlatformRoute && (
              <>
                <button
                  onClick={() => handleNavClick('casal')}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                    currentRoute === 'casal'
                      ? 'bg-[#2D2D2D] text-white shadow-xs'
                      : 'text-[#2D2D2D] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Heart className="w-4 h-4 text-rose-500 fill-current" />
                    <span>Página do Evento</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('presentes')}
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                    currentRoute === 'presentes'
                      ? 'bg-[#2D2D2D] text-white shadow-xs'
                      : 'text-[#2D2D2D] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Gift className="w-4 h-4 text-[#C5A059]" />
                    <span>Lista de Presentes</span>
                  </div>
                  {availableGiftsCount > 0 && (
                    <span className="bg-[#C5A059] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                      {availableGiftsCount} disponíveis
                    </span>
                  )}
                </button>
              </>
            )}

            <button
              onClick={() => handleNavClick('login')}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                currentRoute === 'login'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D] hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-[#C5A059]" />
                <span>{guestSession ? `Perfil: ${guestSession.name}` : 'Entrar / Identificação'}</span>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('noiva')}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                currentRoute === 'noiva'
                  ? 'bg-[#C5A059] text-white shadow-xs'
                  : 'text-[#2D2D2D] bg-[#F2ECE4]/60 hover:bg-[#F2ECE4]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Crown className="w-4 h-4 text-amber-600" />
                <span>Painel do Casal (Noivos)</span>
              </div>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => handleNavClick('superadmin')}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-all min-h-[48px] active:scale-98 cursor-pointer ${
                  currentRoute === 'superadmin'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#1E1E1E] text-amber-400 hover:bg-black'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Super Admin Dashboard</span>
                </div>
              </button>
            )}

          </div>

        </div>
      )}
    </header>
  );
};
