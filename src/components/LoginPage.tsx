import React, { useState } from 'react';
import { EventInfo, GuestAuthSession } from '../types';
import { Crown, Lock, CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Loader2, Heart, Mail, User, Eye, EyeOff, UserCheck, Terminal } from 'lucide-react';
import { loginWithGoogle, loginOrRegisterWithEmail } from '../lib/firebase';

interface LoginPageProps {
  guestSession: GuestAuthSession | null;
  eventInfo: EventInfo;
  onLoginSuccess: (name: string, email: string, provider: 'google' | 'email') => void;
  onLogoutGuest: () => void;
  onNavigate: (route: 'home' | 'casal' | 'presentes' | 'login' | 'noiva' | 'superadmin') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  guestSession,
  eventInfo,
  onLoginSuccess,
  onLogoutGuest,
  onNavigate
}) => {
  // Primary Role Switcher: 'convidado' vs 'casal'
  const [activeRole, setActiveRole] = useState<'convidado' | 'casal'>('convidado');

  // Auth Method inside Role: 'google' vs 'email'
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Email/Pass Form State (Guest)
  const [guestName, setGuestName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email/Pass Form State (Couple)
  const [coupleEmail, setCoupleEmail] = useState('');
  const [couplePassword, setCouplePassword] = useState('');
  const [showCouplePassword, setShowCouplePassword] = useState(false);

  // Email/Pass Form State (Super Admin)
  const [adminEmail, setAdminEmail] = useState('euques@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Google Auth for Guest / Couple
  const handleGoogleAuth = async () => {
    setAuthError('');
    setLoadingAuth(true);
    try {
      const firebaseUser = await loginWithGoogle();
      const userEmail = firebaseUser.email || '';
      const displayName = firebaseUser.displayName || userEmail.split('@')[0] || 'Convidado';

      if (userEmail.toLowerCase() === 'euques@gmail.com') {
        sessionStorage.setItem('cha_superadmin_authenticated', 'true');
        onNavigate('superadmin');
      } else {
        sessionStorage.setItem('cha_couple_authenticated', 'true');
        onLoginSuccess(displayName, userEmail, 'google');
        onNavigate('casal');
      }
    } catch (err: any) {
      console.warn('Google Popup Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Autenticação com Google cancelada.');
      } else {
        setAuthError('Não foi possível abrir a janela do Google. Você também pode logar com E-mail e Senha.');
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  // Email + Password Submit Handler for Guest
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setAuthError('Por favor, informe seu e-mail.');
      return;
    }
    if (!passwordInput.trim() || passwordInput.length < 6) {
      setAuthError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setAuthError('');
    setLoadingAuth(true);

    try {
      const nameToUse = guestName.trim() || emailInput.split('@')[0];
      const user = await loginOrRegisterWithEmail(nameToUse, emailInput.trim(), passwordInput.trim());
      const displayName = user.displayName || nameToUse || 'Convidado';
      
      if (user.email?.toLowerCase() === 'euques@gmail.com') {
        sessionStorage.setItem('cha_superadmin_authenticated', 'true');
        onNavigate('superadmin');
      } else {
        onLoginSuccess(displayName, user.email || emailInput.trim(), 'email');
        onNavigate('casal');
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setAuthError(err.message || 'Erro ao entrar com e-mail e senha.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Email + Password Submit Handler for Couple Admin
  const handleCoupleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleEmail.trim()) {
      setAuthError('Por favor, digite o e-mail cadastrado do casal.');
      return;
    }
    if (!couplePassword.trim() || couplePassword.length < 6) {
      setAuthError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setAuthError('');
    setLoadingAuth(true);

    try {
      const user = await loginOrRegisterWithEmail('Casal', coupleEmail.trim(), couplePassword.trim());
      if (user.email?.toLowerCase() === 'euques@gmail.com') {
        sessionStorage.setItem('cha_superadmin_authenticated', 'true');
        onNavigate('superadmin');
      } else {
        sessionStorage.setItem('cha_couple_authenticated', 'true');
        onNavigate('noiva');
      }
    } catch (err: any) {
      console.error('Couple Auth Error:', err);
      setAuthError(err.message || 'Erro ao entrar na conta do casal. Verifique se os dados estão corretos.');
    } finally {
      setLoadingAuth(false);
    }
  };

  // Email + Password Submit Handler for Super Admin
  const handleSuperAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim().toLowerCase() !== 'euques@gmail.com') {
      setAuthError('O e-mail do Super Admin é exclusivamente euques@gmail.com.');
      return;
    }
    if (!adminPassword.trim() || adminPassword.length < 6) {
      setAuthError('Digite sua senha cadastrada no Firebase (mínimo 6 caracteres).');
      return;
    }

    setAuthError('');
    setLoadingAuth(true);

    try {
      await loginOrRegisterWithEmail('Super Admin', adminEmail.trim(), adminPassword.trim());
      sessionStorage.setItem('cha_superadmin_authenticated', 'true');
      onNavigate('superadmin');
    } catch (err: any) {
      console.error('Super Admin Auth Error:', err);
      setAuthError(err.message || 'Erro de autenticação como Super Admin. Verifique sua senha.');
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 sm:space-y-8 py-3 sm:py-8 px-3 sm:px-4 animate-fade-in">
      
      {/* 1. PRIMARY ROLE SWITCHER TABS (CONVIDADO vs CASAL) */}
      <div className="bg-[#F2ECE4] p-1.5 rounded-2xl border border-[#E5DFD5] shadow-xs flex items-center gap-1">
        <button
          type="button"
          onClick={() => { setActiveRole('convidado'); setAuthError(''); }}
          className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] active:scale-95 ${
            activeRole === 'convidado'
              ? 'bg-[#2D2D2D] text-white shadow-md'
              : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D]'
          }`}
        >
          <UserCheck className={`w-3.5 h-3.5 ${activeRole === 'convidado' ? 'text-[#C5A059]' : ''}`} />
          <span>Convidado</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveRole('casal'); setAuthError(''); }}
          className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] active:scale-95 ${
            activeRole === 'casal'
              ? 'bg-[#C5A059] text-white shadow-md'
              : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D]'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-200" />
          <span>Casal / Noivos</span>
        </button>
      </div>

      {/* 2. CONVIDADO MODE */}
      {activeRole === 'convidado' && (
        <div className="space-y-6 text-center animate-fade-in">
          
          <div className="space-y-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FAF9F6] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-[#E5DFD5]">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-current text-[#C5A059]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
              Identificação do <span className="text-[#C5A059]">Convidado</span>
            </h1>
            <p className="text-xs text-[#2D2D2D]/80 font-medium max-w-sm mx-auto">
              Identifique-se para dar presentes, enviar um recado e confirmar sua presença no evento.
            </p>
          </div>

          {/* LOGGED IN GUEST CARD */}
          {guestSession ? (
            <div className="bg-[#FAF9F6] p-6 rounded-[2rem] border border-[#C5A059]/40 space-y-5 text-center shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#C5A059] bg-[#F2ECE4] px-3.5 py-1 rounded-full border border-[#E5DFD5]">
                  Convidado Identificado
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#2D2D2D] pt-2">
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
                  onClick={() => onNavigate('presentes')}
                  className="w-full py-4 px-5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.15em] rounded-2xl transition flex items-center justify-center space-x-2 shadow-md active:scale-95 cursor-pointer min-h-[48px]"
                >
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Ver Lista de Presentes</span>
                </button>

                <button
                  onClick={() => onNavigate('casal')}
                  className="w-full py-3.5 px-5 bg-[#F2ECE4] hover:bg-[#E5DFD5] text-[#2D2D2D] text-xs font-bold uppercase tracking-[0.15em] rounded-2xl border border-[#E5DFD5] transition flex items-center justify-center space-x-2 active:scale-95 cursor-pointer min-h-[48px]"
                >
                  <span>Ver Página do Casal</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A059]" />
                </button>
              </div>

              <div className="pt-3 border-t border-[#E5DFD5]">
                <button
                  onClick={onLogoutGuest}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider cursor-pointer p-2"
                >
                  Sair ou Trocar Convidado
                </button>
              </div>
            </div>
          ) : (
            /* NOT LOGGED IN GUEST FORM */
            <div className="space-y-4 max-w-sm mx-auto">
              
              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl text-left">
                  {authError}
                </div>
              )}

              {/* AUTH METHOD SELECTOR */}
              <div className="flex bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#E5DFD5]">
                <button
                  type="button"
                  onClick={() => { setAuthMode('google'); setAuthError(''); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer ${
                    authMode === 'google' 
                      ? 'bg-white text-[#2D2D2D] shadow-sm border border-[#E5DFD5]' 
                      : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('email'); setAuthError(''); }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer ${
                    authMode === 'email' 
                      ? 'bg-white text-[#2D2D2D] shadow-sm border border-[#E5DFD5]' 
                      : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                  }`}
                >
                  <Mail className="w-4 h-4 text-[#C5A059]" />
                  <span>E-mail e Senha</span>
                </button>
              </div>

              {/* GOOGLE OPTION */}
              {authMode === 'google' && (
                <div className="space-y-3 animate-fade-in">
                  <button
                    type="button"
                    disabled={loadingAuth}
                    onClick={handleGoogleAuth}
                    className="w-full py-4 px-5 bg-white hover:bg-[#FAF9F6] active:scale-95 text-[#2D2D2D] font-extrabold text-sm rounded-2xl border-2 border-[#C5A059] shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50 cursor-pointer min-h-[52px] group"
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
                    <span className="tracking-wide">Entrar com Google</span>
                  </button>
                </div>
              )}

              {/* EMAIL OPTION */}
              {authMode === 'email' && (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5 text-left bg-white p-5 rounded-2xl border border-[#E5DFD5] shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                      Nome do Convidado
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: Ana Maria"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                      Seu E-mail <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="seu.email@exemplo.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                      Crie uma Senha <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAuth}
                    className="w-full py-3.5 px-5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[48px] cursor-pointer mt-2 active:scale-95"
                  >
                    {loadingAuth ? (
                      <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-[#C5A059]" />
                        <span>Entrar / Cadastrar Convidado</span>
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          )}

        </div>
      )}

      {/* 3. CASAL / NOIVOS MODE */}
      {activeRole === 'casal' && (
        <div className="space-y-6 text-center animate-fade-in max-w-sm mx-auto">
          
          <div className="space-y-2">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-[#E5DFD5]">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-[#C5A059]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
              Painel do <span className="text-[#C5A059]">Casal (Noivos)</span>
            </h1>
            <p className="text-xs text-[#2D2D2D]/75 font-medium leading-relaxed">
              Informe o e-mail e a senha do casal para acessar a gestão restrita do Chá de Panela.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl text-left">
              {authError}
            </div>
          )}

          {/* COUPLE LOGIN FORM */}
          <form onSubmit={handleCoupleEmailAuthSubmit} className="space-y-3.5 text-left bg-white p-5 rounded-2xl border border-[#E5DFD5] shadow-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                E-mail do Casal
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="casal@exemplo.com"
                  value={coupleEmail}
                  onChange={(e) => setCoupleEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                Senha do Casal
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCouplePassword ? 'text' : 'password'}
                  required
                  placeholder="Sua senha de acesso"
                  value={couplePassword}
                  onChange={(e) => setCouplePassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                />
                <button
                  type="button"
                  onClick={() => setShowCouplePassword(!showCouplePassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-1 cursor-pointer"
                >
                  {showCouplePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full py-3.5 px-5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[48px] cursor-pointer mt-2 active:scale-95"
            >
              {loadingAuth ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Entrar no Painel do Casal</span>
                </>
              )}
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
