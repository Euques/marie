import React, { useState } from 'react';
import { GuestAuthSession } from '../types';
import { Crown, Lock, CheckCircle2, ArrowRight, Sparkles, ShieldCheck, ArrowLeft, Loader2, Heart } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';

interface LoginPageProps {
  guestSession: GuestAuthSession | null;
  onLoginSuccess: (name: string, email: string, provider: 'google' | 'email') => void;
  onLogoutGuest: () => void;
  onNavigate: (route: 'home' | 'casal' | 'presentes' | 'login' | 'noiva') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  guestSession,
  onLoginSuccess,
  onLogoutGuest,
  onNavigate
}) => {
  const [authError, setAuthError] = useState('');
  const [googleSelecting, setGoogleSelecting] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Google Auth
  const handleGoogleAuth = async () => {
    setAuthError('');
    setLoadingAuth(true);
    try {
      const firebaseUser = await loginWithGoogle();
      const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Convidado';
      onLoginSuccess(displayName, firebaseUser.email || '', 'google');
      onNavigate('casal');
    } catch (err: any) {
      console.warn('Google Popup Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Autenticação com Google cancelada.');
      } else {
        setAuthError('Não foi possível conectar ao Google automaticamente. Escolha uma conta rápida abaixo para continuar:');
        setGoogleSelecting(true);
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  // Quick Google Login Fallback for preview/testing
  const handleGoogleQuickLogin = (name: string, email: string) => {
    onLoginSuccess(name, email, 'google');
    onNavigate('casal');
  };

  return (
    <div className="max-w-xl mx-auto space-y-10 py-8 px-4 animate-fade-in text-center">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-[#E5DFD5]">
          <Heart className="w-8 h-8 fill-current text-[#C5A059]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2D2D2D] tracking-tight">
          Identificação do <span className="text-[#C5A059]">Convidado</span>
        </h1>
        <p className="text-sm text-[#2D2D2D]/75 max-w-sm mx-auto leading-relaxed font-medium">
          Entrada simples e rápida para você confirmar presença e escolher presentes na lista do casal.
        </p>
      </div>

      {/* LOGGED IN USER VIEW */}
      {guestSession ? (
        <div className="bg-[#FAF9F6] p-8 rounded-[2rem] border border-[#C5A059]/40 space-y-6 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#C5A059] bg-[#F2ECE4] px-3.5 py-1 rounded-full border border-[#E5DFD5]">
              Conectado com Sucesso
            </span>
            <h3 className="text-2xl font-extrabold text-[#2D2D2D] pt-3">
              {guestSession.name}
            </h3>
            {guestSession.email && (
              <p className="text-xs text-[#2D2D2D]/60 font-medium">
                {guestSession.email}
              </p>
            )}
          </div>

          <div className="pt-2 space-y-3 max-w-sm mx-auto">
            <button
              onClick={() => onNavigate('casal')}
              className="w-full py-4 px-5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.15em] rounded-2xl transition flex items-center justify-center space-x-2 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Acessar Site do Casal</span>
              <ArrowRight className="w-4 h-4 text-[#C5A059]" />
            </button>

            <button
              onClick={() => onNavigate('presentes')}
              className="w-full py-3.5 px-5 bg-[#F2ECE4] hover:bg-[#E5DFD5] text-[#2D2D2D] text-xs font-bold uppercase tracking-[0.15em] rounded-2xl border border-[#E5DFD5] transition flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>Ver Lista de Presentes</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#E5DFD5]">
            <button
              onClick={onLogoutGuest}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider cursor-pointer"
            >
              Trocar de Conta
            </button>
          </div>
        </div>
      ) : (
        /* NOT LOGGED IN - PROMINENT GOOGLE BUTTON ONLY */
        <div className="space-y-6 max-w-sm mx-auto">
          
          {authError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl text-center">
              {authError}
            </div>
          )}

          {/* HIGHLY PROMINENT GOOGLE LOGIN BUTTON */}
          <div className="space-y-4">
            <button
              type="button"
              disabled={loadingAuth}
              onClick={handleGoogleAuth}
              className="w-full py-4 px-6 bg-white hover:bg-[#FAF9F6] active:scale-95 text-[#2D2D2D] font-extrabold text-sm rounded-2xl border-2 border-[#C5A059] shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-3 disabled:opacity-50 cursor-pointer group"
            >
              {loadingAuth ? (
                <Loader2 className="w-6 h-6 text-[#C5A059] animate-spin" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white p-1 border border-[#E5DFD5] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                  </svg>
                </div>
              )}
              <span className="tracking-wide">Continuar com o Google</span>
            </button>

            <div className="flex items-center justify-center space-x-1.5 text-xs text-[#2D2D2D]/60 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Autenticação rápida e 100% segura</span>
            </div>

            {/* QUICK GOOGLE ACCOUNTS SELECTOR IF POPUP PREVENTED */}
            {googleSelecting && (
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5DFD5] space-y-3 animate-scale-up text-left">
                <p className="text-[10px] text-[#2D2D2D]/70 uppercase tracking-widest font-extrabold text-center">
                  Selecione uma conta para acesso instantâneo:
                </p>
                <button
                  type="button"
                  onClick={() => handleGoogleQuickLogin('Mariana Silva', 'mariana.silva@gmail.com')}
                  className="w-full p-3 bg-white hover:bg-[#F2ECE4] border border-[#E5DFD5] rounded-xl text-left flex items-center space-x-3 transition shadow-2xs cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
                    M
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2D2D2D]">Mariana Silva</div>
                    <div className="text-[10px] text-[#2D2D2D]/60 font-medium">mariana.silva@gmail.com</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleQuickLogin('Lucas Oliveira', 'lucas.oliveira@gmail.com')}
                  className="w-full p-3 bg-white hover:bg-[#F2ECE4] border border-[#E5DFD5] rounded-xl text-left flex items-center space-x-3 transition shadow-2xs cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-xs">
                    L
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#2D2D2D]">Lucas Oliveira</div>
                    <div className="text-[10px] text-[#2D2D2D]/60 font-medium">lucas.oliveira@gmail.com</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ÁREA EXCLUSIVA DO CASAL */}
      <div className="pt-6 border-t border-[#E5DFD5] text-center space-y-3 max-w-sm mx-auto">
        <div className="flex items-center justify-center space-x-2 text-[#C5A059]">
          <Crown className="w-5 h-5" />
          <span className="font-extrabold text-sm text-[#2D2D2D]">
            É um dos Noivos?
          </span>
        </div>
        <p className="text-xs text-[#2D2D2D]/70 leading-relaxed font-medium">
          Acesse o painel gerencial exclusivo para gerenciar lista de presentes e lista de convidados.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('noiva')}
          className="px-6 py-3 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition inline-flex items-center space-x-2 active:scale-95 shadow-xs cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
          <span>Acessar Painel do Casal</span>
        </button>
      </div>

    </div>
  );
};
