import React from 'react';
import { AppRoute, CoupleProfile } from '../types';
import { 
  Heart, Sparkles, Gift, Users, ArrowRight, 
  PlusCircle, Calendar, MapPin, Crown, Eye
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: AppRoute) => void;
  couples: CoupleProfile[];
  onSelectCouple: (coupleId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onNavigate, 
  couples = [],
  onSelectCouple,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16 py-4 px-2 sm:px-4 animate-fade-in">
      
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-5 pt-2 sm:pt-6">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-[#F2ECE4] text-[#C5A059] rounded-full border border-[#E5DFD5] shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#2D2D2D]">
            Plataforma de Chá de Panela & Casa Nova
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#2D2D2D] tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Casais Cadastrados & <span className="text-[#C5A059]">Chás de Panela</span>
        </h1>

        <p className="text-sm sm:text-base text-[#2D2D2D]/75 max-w-2xl mx-auto font-medium leading-relaxed">
          Encontre o evento do seu casal amigo para presentear e confirmar presença, ou cadastre o seu próprio Chá de Panela em instantes.
        </p>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => onNavigate('noiva')}
            className="px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-extrabold uppercase tracking-[0.18em] rounded-2xl shadow-xl transition-all flex items-center space-x-2.5 active:scale-95 cursor-pointer min-h-[50px]"
          >
            <PlusCircle className="w-5 h-5 text-[#C5A059]" />
            <span>Cadastrar / Entrar como Casal</span>
          </button>
        </div>
      </section>

      {/* 2. REAL REGISTERED COUPLES CARDS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2D2D2D] tracking-tight flex items-center space-x-2">
              <Heart className="w-5 h-5 text-[#C5A059] fill-[#C5A059]/20" />
              <span>Casais Cadastrados</span>
            </h2>
            <p className="text-xs text-[#2D2D2D]/60 font-medium">
              Selecione o casal para acessar a lista de presentes e confirmar presença
            </p>
          </div>
          <span className="bg-[#F2ECE4] text-[#2D2D2D] px-3 py-1 rounded-full text-xs font-bold border border-[#E5DFD5]">
            {couples.length} {couples.length === 1 ? 'casal' : 'casais'}
          </span>
        </div>

        {couples.length === 0 ? (
          /* EMPTY STATE CARD WHEN NO COUPLES REGISTERED YET */
          <div className="bg-[#FAF9F6] border-2 border-dashed border-[#E5DFD5] rounded-[2.5rem] p-8 sm:p-12 text-center space-y-5 max-w-xl mx-auto">
            <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto border border-[#E5DFD5] shadow-xs">
              <Heart className="w-8 h-8 text-[#C5A059]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#2D2D2D]">
                Nenhum Casal Cadastrado no Momento
              </h3>
              <p className="text-xs sm:text-sm text-[#2D2D2D]/70 font-medium leading-relaxed">
                Seja o primeiro a cadastrar seu Chá de Panela! Crie uma lista de presentes personalizada e receba doações em PIX sem taxas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('noiva')}
              className="px-8 py-4 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-md transition flex items-center justify-center space-x-2 mx-auto active:scale-95 cursor-pointer min-h-[48px]"
            >
              <Crown className="w-4 h-4" />
              <span>Cadastrar Nosso Chá de Panela</span>
            </button>
          </div>
        ) : (
          /* GRID OF REGISTERED COUPLES */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {couples.map((couple) => {
              const info = couple.eventInfo;
              const brideGroomTitle = `${info.brideName || 'Noiva'} & ${info.groomName || 'Noivo'}`;
              return (
                <div 
                  key={couple.id}
                  className="bg-white rounded-[2rem] border border-[#E5DFD5] shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                >
                  {/* COVER IMAGE */}
                  <div className="h-44 bg-[#F2ECE4] relative overflow-hidden flex items-center justify-center">
                    {info.coverImage ? (
                      <img 
                        src={info.coverImage} 
                        alt={brideGroomTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Heart className="w-12 h-12 text-[#C5A059] mx-auto opacity-40 mb-1" />
                        <span className="text-xs font-bold text-[#2D2D2D]/40 uppercase tracking-wider">Chá de Panela</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-[#2D2D2D] border border-white/40 shadow-xs">
                      {couple.gifts?.filter(g => !g.isClaimed).length || 0} presentes disponíveis
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-5 space-y-3 flex-1">
                    <div>
                      <h3 className="text-xl font-extrabold text-[#2D2D2D] tracking-tight group-hover:text-[#C5A059] transition-colors">
                        {brideGroomTitle}
                      </h3>
                      <p className="text-xs font-semibold text-[#C5A059]">
                        {info.eventTitle || 'Chá de Panela'}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#2D2D2D]/70 font-medium">
                      {info.date && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                          <span>Data: {info.date} {info.time && `às ${info.time}`}</span>
                        </div>
                      )}
                      {info.location && (
                        <div className="flex items-center space-x-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                          <span className="truncate">{info.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCouple(couple.id);
                        onNavigate('casal');
                      }}
                      className="w-full py-3 px-3 bg-[#FAF9F6] hover:bg-[#F2ECE4] border border-[#E5DFD5] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Ver Evento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectCouple(couple.id);
                        onNavigate('presentes');
                      }}
                      className="w-full py-3 px-3 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs min-h-[44px]"
                    >
                      <Gift className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Presentes</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. PLATFORM FEATURES */}
      <section className="space-y-6 pt-4">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C5A059] bg-[#F2ECE4] px-3 py-1 rounded-full border border-[#E5DFD5]">
            Para os Noivos
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
            Por que criar seu Chá de Panela aqui?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-[#E5DFD5] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2D]">Lista sem Repetição</h3>
            <p className="text-xs text-[#2D2D2D]/70 font-medium leading-relaxed">
              Os convidados escolhem e reservam os presentes online, garantindo que você não receba itens repetidos.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5DFD5] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2D]">PIX Direto sem Taxas</h3>
            <p className="text-xs text-[#2D2D2D]/70 font-medium leading-relaxed">
              Receba presentes em dinheiro diretamente no seu banco com QR Code PIX, sem intermediários.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5DFD5] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2D]">RSVP Online Completo</h3>
            <p className="text-xs text-[#2D2D2D]/70 font-medium leading-relaxed">
              Acompanhe em tempo real quem vai ao seu evento, quantidade de acompanhantes e recados especiais.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
