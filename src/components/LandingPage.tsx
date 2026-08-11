import React, { useState } from 'react';
import { AppRoute, EventInfo } from '../types';
import { 
  Heart, Sparkles, Gift, Users, CheckCircle2, ArrowRight, 
  ShieldCheck, Camera, Calendar, MapPin, Mail, Lock, Eye, EyeOff, 
  Loader2, ExternalLink, QrCode, Smartphone
} from 'lucide-react';
import { authenticateBrideAdminWithFirebase } from '../lib/firebase';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
  eventInfo: EventInfo;
  onUpdateEventInfo?: (info: EventInfo) => Promise<void>;
  onRegisterCouple?: (info: EventInfo) => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigate, 
  eventInfo,
  onUpdateEventInfo,
  onRegisterCouple
}) => {
  // Couple registration form state
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegisterCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brideName.trim() || !groomName.trim()) {
      setErrorMsg('Por favor, preencha os nomes do casal.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha o e-mail e senha de acesso.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Authenticate / Create Firebase Auth user for the bride
      await authenticateBrideAdminWithFirebase(email.trim(), password.trim(), 'register');

      // 2. Register new couple & reset guests list for clean slate
      const newTitle = eventTitle.trim() || `Chá de Panela de ${brideName.trim()} & ${groomName.trim()}`;
      const payload: EventInfo = {
        ...eventInfo,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        eventTitle: newTitle,
        date: eventDate || eventInfo.date,
        pixKey: pixKey.trim() || eventInfo.pixKey,
      };

      if (onRegisterCouple) {
        await onRegisterCouple(payload);
      } else if (onUpdateEventInfo) {
        await onUpdateEventInfo(payload);
      }

      setSuccessMsg('Chá de Panela cadastrado com sucesso! Redirecionando para o seu Painel da Noiva...');
      setTimeout(() => {
        onNavigate('noiva');
      }, 1200);
    } catch (err: any) {
      console.error('Registration Error:', err);
      if (err.message?.includes('email-already-in-use') || err.code === 'auth/email-already-in-use') {
        try {
          await authenticateBrideAdminWithFirebase(email.trim(), password.trim(), 'login');
          setSuccessMsg('Login realizado com sucesso! Acessando o Painel...');
          setTimeout(() => {
            onNavigate('noiva');
          }, 1200);
          return;
        } catch (loginErr: any) {
          setErrorMsg('E-mail já cadastrado. Verifique a senha informada ou faça login.');
        }
      } else {
        setErrorMsg(err.message || 'Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-4 px-2 sm:px-4">
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-[#F2ECE4] text-[#C5A059] rounded-full border border-[#E5DFD5] shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#2D2D2D]">
            Plataforma Completa para Chá de Panela & Casa Nova
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#2D2D2D] tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Crie o Site Perfeito para o seu <span className="text-[#C5A059]">Chá de Panela</span> em Minutos
        </h1>

        <p className="text-base sm:text-xl text-[#2D2D2D]/75 max-w-2xl mx-auto font-medium leading-relaxed">
          Lista de presentes com Pix direto na sua conta, confirmação de presença (RSVP) de convidados, galeria de fotos e total controle para os noivos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="#cadastrar-casal"
            className="w-full sm:w-auto px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 active:scale-95 cursor-pointer"
          >
            <Heart className="w-4 h-4 text-[#C5A059] fill-current" />
            <span>Criar Nosso Site Grátis</span>
          </a>

          <button
            onClick={() => onNavigate('casal')}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#FAF9F6] text-[#2D2D2D] border-2 border-[#E5DFD5] hover:border-[#C5A059] text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#C5A059]" />
            <span>Ver Exemplo de Site de Casal</span>
          </button>
        </div>
      </section>

      {/* 2. DEMO EVENT BANNER (BEATRIZ & GABRIEL) */}
      <section className="bg-gradient-to-r from-[#2D2D2D] via-[#1E1E1E] to-[#2D2D2D] text-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-[#C5A059]/40 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 text-center md:text-left">
          <span className="px-3 py-1 bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block">
            Exemplo Ativo
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            Exemplo: {eventInfo.brideName} & {eventInfo.groomName}
          </h3>
          <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
            Veja como fica o layout personalizado do casal com lista de presentes interativa, QR Code PIX, confirmação de presença e recados dos convidados!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
          <button
            onClick={() => onNavigate('casal')}
            className="px-6 py-3.5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <span>Ver Site de {eventInfo.brideName}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onNavigate('noiva')}
            className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span>Painel da Noiva</span>
          </button>
        </div>
      </section>

      {/* 3. CADASTRO DE NOVO CASAL (FORMULARIO PRINCIPAL) */}
      <section id="cadastrar-casal" className="bg-white rounded-[2.5rem] shadow-xl border-2 border-[#E5DFD5] p-6 sm:p-10 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="w-14 h-14 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-[#E5DFD5]">
            <Sparkles className="w-7 h-7 text-[#C5A059]" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2D2D2D] tracking-tight">
            Cadastre seu Chá de Panela
          </h2>
          <p className="text-xs sm:text-sm text-[#2D2D2D]/70 font-medium">
            Preencha os dados básicos do casal para liberar o seu site exclusivo e painel de controle.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-xl mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="max-w-xl mx-auto p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegisterCouple} className="max-w-2xl mx-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                Nome da Noiva <span className="text-[#C5A059]">*</span>
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: Beatriz"
                value={brideName}
                onChange={e => setBrideName(e.target.value)}
                className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                Nome do Noivo <span className="text-[#C5A059]">*</span>
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: Gabriel"
                value={groomName}
                onChange={e => setGroomName(e.target.value)}
                className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
              Título do Evento (Opcional)
            </label>
            <input 
              type="text"
              placeholder="Ex: Chá de Panela da Bia & Gabriel"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                Data Prevista do Evento
              </label>
              <input 
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans text-[#2D2D2D]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                Chave PIX da Noiva (Para presentes)
              </label>
              <input 
                type="text"
                placeholder="Ex: CPF, Telefone ou Chave Aleatória"
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
              />
            </div>
          </div>

          {/* LOGIN / FIREBASE CREDENTIALS FOR ADMIN */}
          <div className="pt-2 border-t border-[#E5DFD5] space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block">
              Credenciais de Acesso do Painel da Noiva
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                  E-mail da Noiva <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                  <input 
                    type="email"
                    required
                    placeholder="noiva@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                  Crie sua Senha <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-[#2D2D2D]/40 hover:text-[#2D2D2D]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#2D2D2D] hover:bg-black active:scale-98 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#C5A059]" />
            )}
            <span>{loading ? 'Cadastrando Casal...' : 'Criar Nosso Chá de Panela Agora'}</span>
          </button>
        </form>
      </section>

      {/* 4. RECURSOS / DIFERENCIAIS */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C5A059] bg-[#F2ECE4] px-3 py-1 rounded-full border border-[#E5DFD5]">
            Funcionalidades Exclusivas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2D2D2D] tracking-tight">
            Tudo o que você precisa em um só lugar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-[#E5DFD5] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center shadow-2xs">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2D2D2D]">Lista de Presentes Inteligente</h3>
            <p className="text-xs text-[#2D2D2D]/70 leading-relaxed font-medium">
              Escolha entre presentes pré-cadastrados ou adicione seus próprios mimos. Os convidados marcam o item escolhido para evitar repetição.
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-[#E5DFD5] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center shadow-2xs">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2D2D2D]">Presente em PIX Sem Taxas</h3>
            <p className="text-xs text-[#2D2D2D]/70 leading-relaxed font-medium">
              Cadastre sua chave PIX para receber contribuições em dinheiro diretamente na sua conta bancária sem comissão.
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-[#E5DFD5] shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#2D2D2D]">RSVP & WhatsApp</h3>
            <p className="text-xs text-[#2D2D2D]/70 leading-relaxed font-medium">
              Controle de presença online, acompanhantes e recados dos convidados, além de mensagens automáticas prontas para WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FOOTER CTA */}
      <section className="bg-[#FAF9F6] border-2 border-[#E5DFD5] rounded-[2.5rem] p-8 sm:p-12 text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-[#2D2D2D]">
            Pronta para organizar seu Chá de Panela dos sonhos?
          </h2>
          <p className="text-xs sm:text-sm text-[#2D2D2D]/75 font-medium">
            Junte-se a diversos casais que organizaram seu evento de forma prática e elegante.
          </p>
        </div>

        <a
          href="#cadastrar-casal"
          className="inline-flex items-center space-x-2 px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span>Cadastrar Nosso Casal Agora</span>
        </a>
      </section>
    </div>
  );
};
