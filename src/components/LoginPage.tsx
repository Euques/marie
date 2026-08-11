import React, { useState } from 'react';
import { GuestAuthSession } from '../types';
import { Crown, Lock, Mail, Unlock, User, CheckCircle2, ArrowRight, Sparkles, Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { loginOrRegisterWithEmail, loginWithGoogle } from '../lib/firebase';

interface LoginPageProps {
  guestSession: GuestAuthSession | null;
  onLoginSuccess: (name: string, email: string, provider: 'google' | 'email') => void;
  onLogoutGuest: () => void;
  onNavigate: (route: 'home' | 'presentes' | 'login' | 'noiva') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  guestSession,
  onLoginSuccess,
  onLogoutGuest,
  onNavigate
}) => {
  // Form State
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [googleSelecting, setGoogleSelecting] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Email/Password login submit via Firebase Auth
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setAuthError('Por favor, digite seu nome completo.');
      return;
    }
    if (!emailInput.trim()) {
      setAuthError('Por favor, informe seu e-mail.');
      return;
    }
    if (!passwordInput.trim() || passwordInput.length < 6) {
      setAuthError('Por favor, insira uma senha com pelo menos 6 caracteres para o Firebase.');
      return;
    }

    setAuthError('');
    setLoadingAuth(true);

    try {
      const firebaseUser = await loginOrRegisterWithEmail(nameInput.trim(), emailInput.trim(), passwordInput.trim());
      const displayName = firebaseUser.displayName || nameInput.trim();
      onLoginSuccess(displayName, firebaseUser.email || emailInput.trim(), 'email');
      onNavigate('home');
    } catch (err: any) {
      console.error('Firebase Email Auth Error:', err);
      setAuthError(err.message || 'Erro ao realizar login no Firebase.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Google Auth via Firebase
  const handleGoogleAuth = async () => {
    setAuthError('');
    setLoadingAuth(true);
    try {
      const firebaseUser = await loginWithGoogle();
      const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Convidado Google';
      onLoginSuccess(displayName, firebaseUser.email || '', 'google');
      onNavigate('home');
    } catch (err: any) {
      console.warn('Google Popup Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Login com Google cancelado.');
      } else {
        setAuthError('Erro na autenticação do Google. Escolha uma conta abaixo para continuar:');
        setGoogleSelecting(true);
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  // Quick Google Login Fallback
  const handleGoogleQuickLogin = (name: string, email: string) => {
    onLoginSuccess(name, email, 'google');
    onNavigate('home');
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12 animate-fade-in px-2 sm:px-0">
      
      {/* Main Login Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-[#E5DFD5] overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D]">
            Aceitar <span className="text-[#C5A059]">Convite</span>
          </h1>
          <p className="text-xs text-[#2D2D2D]/70 max-w-xs mx-auto leading-relaxed">
            Autenticação segura via Firebase. Identifique-se para preencher seus dados de convidado e acessar a lista de presentes.
          </p>
        </div>

        {/* LOGGED IN USER VIEW */}
        {guestSession ? (
          <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-[#C5A059]/40 space-y-5 text-center shadow-2xs">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#C5A059] bg-[#F2ECE4] px-3 py-1 rounded-full border border-[#E5DFD5]">
                Autenticado via Firebase ({guestSession.provider === 'google' ? 'Google' : 'E-mail'})
              </span>
              <h3 className="text-xl font-bold text-[#2D2D2D] pt-2">
                {guestSession.name}
              </h3>
              {guestSession.email && (
                <p className="text-xs text-[#2D2D2D]/60 font-mono">
                  {guestSession.email}
                </p>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => onNavigate('home')}
                className="w-full py-3.5 px-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shadow-xs active:scale-98"
              >
                <span>Preencher / Confirmar Presença</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('presentes')}
                className="w-full py-3.5 px-4 bg-[#F2ECE4] hover:bg-[#E5DFD5] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#E5DFD5] transition flex items-center justify-center space-x-2 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>Ver Lista de Presentes</span>
              </button>

              <button
                onClick={() => onNavigate('home')}
                className="w-full py-3 px-4 bg-white hover:bg-[#FAF9F6] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#E5DFD5] transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
                <span>Voltar</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#E5DFD5]">
              <button
                onClick={onLogoutGuest}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 underline uppercase tracking-wider"
              >
                Sair da Conta (Firebase)
              </button>
            </div>
          </div>
        ) : (
          /* NOT LOGGED IN - SEQUENCE: 1. GOOGLE BUTTON -> 2. DIVIDER -> 3. FORM -> 4. AREA DO CASAL BELOW */
          <div className="space-y-6">
            
            {/* 1. BOTÃO DO GOOGLE (FIREBASE AUTH) */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={loadingAuth}
                onClick={handleGoogleAuth}
                className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 active:scale-98 text-[#2D2D2D] font-bold text-xs rounded-2xl border-2 border-[#E5DFD5] hover:border-[#C5A059] transition flex items-center justify-center space-x-3 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loadingAuth ? (
                  <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                  </svg>
                )}
                <span>Entrar com o Google (Firebase)</span>
              </button>

              {/* QUICK GOOGLE ACCOUNTS EXPANDABLE */}
              {googleSelecting && (
                <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5DFD5] space-y-2 animate-scale-up">
                  <p className="text-[10px] text-[#2D2D2D]/60 uppercase tracking-wider font-bold text-center">
                    Escolha uma conta de teste para rápida identificação:
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGoogleQuickLogin('Mariana Silva', 'mariana.silva@gmail.com')}
                    className="w-full p-2.5 bg-white hover:bg-[#F2ECE4] border border-[#E5DFD5] rounded-xl text-left flex items-center space-x-3 transition shadow-2xs cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      M
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2D2D2D]">Mariana Silva</div>
                      <div className="text-[10px] text-[#2D2D2D]/60 font-mono">mariana.silva@gmail.com</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoogleQuickLogin('Lucas Oliveira', 'lucas.oliveira@gmail.com')}
                    className="w-full p-2.5 bg-white hover:bg-[#F2ECE4] border border-[#E5DFD5] rounded-xl text-left flex items-center space-x-3 transition shadow-2xs cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs">
                      L
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2D2D2D]">Lucas Oliveira</div>
                      <div className="text-[10px] text-[#2D2D2D]/60 font-mono">lucas.oliveira@gmail.com</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. DIVISOR */}
            <div className="relative py-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5DFD5]"></div>
              </div>
              <span className="relative bg-white px-3 text-[10px] font-bold text-[#2D2D2D]/50 uppercase tracking-widest">
                ou com e-mail e senha no Firebase
              </span>
            </div>

            {/* 3. FORMULÁRIO DE E-MAIL E SENHA DO FIREBASE AUTH */}
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                  Seu Nome Completo <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Beatriz Silva"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                  Seu E-mail <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: maria.beatriz@email.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                  Senha do Firebase (mínimo 6 caracteres) <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] focus:bg-white outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#2D2D2D]/40 hover:text-[#2D2D2D]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full py-3.5 bg-[#2D2D2D] hover:bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-xs transition active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 text-[#C5A059] animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4 text-[#C5A059]" />
                )}
                <span>{loadingAuth ? 'Autenticando...' : 'Entrar / Cadastrar (Firebase)'}</span>
              </button>
            </form>

            <div className="text-center text-[11px] text-[#2D2D2D]/50 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Autenticação direta com Firebase Auth</span>
            </div>

            {/* BOTÃO DE VOLTAR NO BOTTOM DO CARD DE LOGIN */}
            <div className="pt-3 border-t border-[#E5DFD5]">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="w-full py-2.5 px-3 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-xl border border-[#E5DFD5] transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Voltar</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. ÁREA DO CASAL - POSICIONADA RIGOROSAMENTE EM BAIXO DO FORMULÁRIO DO CONVIDADO */}
      <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5DFD5] text-center space-y-3 shadow-2xs">
        <div className="flex items-center justify-center space-x-2 text-[#C5A059]">
          <Crown className="w-5 h-5" />
          <span className="font-bold text-sm text-[#2D2D2D]">
            Área Exclusiva do Casal
          </span>
        </div>
        <p className="text-xs text-[#2D2D2D]/60 leading-relaxed max-w-xs mx-auto">
          Painel gerencial do noivo e da noiva para administrar lista de convidados, cadastrar presentes e gerenciar o evento.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('noiva')}
          className="px-5 py-2.5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition inline-flex items-center space-x-2 active:scale-95 shadow-2xs cursor-pointer"
        >
          <Crown className="w-4 h-4 text-[#C5A059]" />
          <span>Acessar Painel da Noiva / Noivo</span>
        </button>
      </div>

      {/* 5. BOTÃO DE VOLTAR NO RODAPÉ DO LOGIN */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-full py-3.5 px-4 bg-white hover:bg-[#FAF9F6] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-2xl border-2 border-[#E5DFD5] hover:border-[#C5A059] transition flex items-center justify-center space-x-2 shadow-2xs active:scale-98 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
          <span>Voltar</span>
        </button>
      </div>

    </div>
  );
};

