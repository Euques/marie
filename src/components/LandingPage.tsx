import React from 'react';
import { AppRoute, EventInfo } from '../types';
import { 
  Heart, Sparkles, Gift, Users, ArrowRight, 
  ShieldCheck, Eye, QrCode, Lock
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
  eventInfo: EventInfo;
  onUpdateEventInfo?: (info: EventInfo) => Promise<void>;
  onRegisterCouple?: (info: EventInfo) => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigate, 
  eventInfo,
}) => {
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
          <button
            onClick={() => onNavigate('noiva')}
            className="w-full sm:w-auto px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 active:scale-95 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-[#C5A059]" />
            <span>Acessar / Cadastrar Nosso Painel</span>
          </button>

          <button
            onClick={() => onNavigate('casal')}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#FAF9F6] text-[#2D2D2D] border-2 border-[#E5DFD5] hover:border-[#C5A059] text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#C5A059]" />
            <span>Ver Exemplo de Site de Casal</span>
          </button>
        </div>
      </section>

      {/* 2. DEMO EVENT BANNER (EXEMPLO ATIVO) */}
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
            <span>Painel do Casal</span>
          </button>
        </div>
      </section>

      {/* 3. RECURSOS / DIFERENCIAIS */}
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

      {/* 4. FOOTER CTA */}
      <section className="bg-[#FAF9F6] border-2 border-[#E5DFD5] rounded-[2.5rem] p-8 sm:p-12 text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-3xl font-extrabold text-[#2D2D2D]">
            Pronta para organizar seu Chá de Panela dos sonhos?
          </h2>
          <p className="text-xs sm:text-sm text-[#2D2D2D]/75 font-medium">
            Junte-se a diversos casais que organizaram seu evento de forma prática e elegante.
          </p>
        </div>

        <button
          onClick={() => onNavigate('noiva')}
          className="inline-flex items-center space-x-2 px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span>Acessar Painel do Casal Agora</span>
        </button>
      </section>
    </div>
  );
};
