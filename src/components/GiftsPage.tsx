import React, { useState, useMemo } from 'react';
import { Gift, GiftCategory, GuestAuthSession, Guest, RsvpStatus } from '../types';
import { CustomGiftModal } from './CustomGiftModal';
import { 
  Gift as GiftIcon, Search, Sparkles, Lock, 
  ChevronDown, ChevronUp, Plus, Heart, User, CheckCircle2,
  RotateCcw, ExternalLink, ShoppingBag, ArrowLeft, ArrowRight,
  PackageCheck, ListPlus, Users, MessageSquare, Send, Calendar
} from 'lucide-react';

interface GiftsPageProps {
  gifts: Gift[];
  guestSession: GuestAuthSession | null;
  isPresenceConfirmed: boolean;
  isCoupleAdmin?: boolean;
  isSuperAdmin?: boolean;
  eventInfo?: any;
  guests?: Guest[];
  onSubmitRsvp?: (data: { name: string; email?: string; phone?: string; companions?: number; status: 'confirmed' | 'declined'; message?: string }) => Promise<void>;
  onClaimGift: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
  onUnclaimGift: (giftId: string) => Promise<void>;
  onAddCustomGift: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; imageUrl?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  onNavigate: (route: 'home' | 'casal' | 'presentes' | 'login' | 'noiva') => void;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const GiftsPage: React.FC<GiftsPageProps> = ({
  gifts,
  guestSession,
  isPresenceConfirmed,
  isCoupleAdmin = false,
  isSuperAdmin = false,
  eventInfo,
  guests = [],
  onSubmitRsvp,
  onClaimGift,
  onUnclaimGift,
  onAddCustomGift,
  onNavigate
}) => {
  // Tab state: 'precisamos' (O que precisamos) vs 'ja_temos' (O que já temos)
  const [activeTab, setActiveTab] = useState<'precisamos' | 'ja_temos'>('precisamos');
  
  // Search state & category filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Action loading states
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);

  // Expanded items state (each gift card is an accordion)
  const [expandedGiftIds, setExpandedGiftIds] = useState<Record<string, boolean>>({});

  // Custom Gift Modal
  const [isCustomGiftModalOpen, setIsCustomGiftModalOpen] = useState(false);

  // Check if bride has registered WhatsApp phone (only show Sugerir Presente button if registered)
  const hasBrideWhatsApp = useMemo(() => {
    return Boolean(
      eventInfo?.bridePhone && eventInfo.bridePhone.trim().replace(/\D/g, '').length >= 8
    );
  }, [eventInfo?.bridePhone]);

  // RSVP Form state for unconfirmed guests
  const [rsvpName, setRsvpName] = useState(guestSession?.name || '');
  const [rsvpEmail, setRsvpEmail] = useState(guestSession?.email || '');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [rsvpCompanions, setRsvpCompanions] = useState(0);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [rsvpDeclinedSubmitted, setRsvpDeclinedSubmitted] = useState(false);

  // 1. My Selected Gifts (Selected by current guest)
  const mySelectedGifts = useMemo(() => {
    const currentName = guestSession?.name || rsvpName;
    if (!currentName) return [];
    return gifts.filter(g => 
      g.isClaimed && g.claimedByGuestName?.trim().toLowerCase() === currentName.trim().toLowerCase()
    );
  }, [gifts, guestSession, rsvpName]);

  // 2. Needed Gifts ("O que precisamos" - Not claimed by anyone yet)
  const neededGifts = useMemo(() => {
    return gifts.filter(g => !g.isClaimed);
  }, [gifts]);

  // 3. Acquired Gifts ("O que já temos" - All gifts claimed)
  const acquiredGifts = useMemo(() => {
    return gifts.filter(g => g.isClaimed);
  }, [gifts]);

  const toggleGiftAccordion = (giftId: string) => {
    setExpandedGiftIds(prev => ({ ...prev, [giftId]: !prev[giftId] }));
  };

  // Direct 1-Click Gift Selection
  const handleDirectClaim = async (gift: Gift) => {
    const currentName = guestSession?.name || rsvpName;
    if (!currentName) return;
    try {
      setClaimingId(gift.id);
      await onClaimGift(gift.id, {
        guestName: currentName,
        guestEmail: guestSession?.email || rsvpEmail || undefined
      });
    } catch (err) {
      console.error('Erro ao selecionar presente:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const handleUnclaim = async (gift: Gift) => {
    try {
      setUnclaimingId(gift.id);
      await onUnclaimGift(gift.id);
    } catch (err) {
      console.error('Erro ao desmarcar presente:', err);
    } finally {
      setUnclaimingId(null);
    }
  };

  // Handle RSVP confirmation directly on the gifts page
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) {
      setRsvpError('Por favor, informe seu nome completo.');
      return;
    }

    try {
      setIsSubmittingRsvp(true);
      setRsvpError(null);

      if (onSubmitRsvp) {
        await onSubmitRsvp({
          name: rsvpName.trim(),
          email: rsvpEmail.trim() || undefined,
          phone: rsvpPhone.trim() || undefined,
          companions: rsvpCompanions,
          status: rsvpStatus,
          message: rsvpMessage.trim() || undefined
        });
      }

      if (rsvpStatus === 'declined') {
        setRsvpDeclinedSubmitted(true);
      }
    } catch (err) {
      console.error('Erro ao registrar presença:', err);
      setRsvpError('Ocorreu um erro ao registrar sua presença. Tente novamente.');
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  /* ========================================================================= */
  /* BLOQUEIO DE ACESSO À LISTA DE PRESENTES:                                  */
  /* 1. Obrigatório estar LOGADO (guestSession válido)                         */
  /* 2. Obrigatório CONFIRMAR PRESENÇA (isPresenceConfirmed === true)          */
  /* ========================================================================= */
  if (!isCoupleAdmin && !isSuperAdmin) {
    // 1. Usuário NÃO está logado: bloquear visualização e exigir login primeiro
    if (!guestSession) {
      return (
        <div className="max-w-lg mx-auto py-8 sm:py-12 px-2 sm:px-0 animate-fade-in font-sans">
          <div className="bg-white rounded-[2rem] p-6 sm:p-9 border border-[#E5DFD5] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto border border-[#E5DFD5] shadow-2xs">
              <Lock className="w-8 h-8 text-[#C5A059]" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-800 bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200 inline-block">
                Acesso Exclusivo para Convidados
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
                Lista de Presentes <span className="text-[#C5A059]">Protegida</span>
              </h2>

              <p className="text-xs sm:text-sm text-[#2D2D2D]/75 leading-relaxed max-w-md mx-auto">
                {eventInfo?.brideName && eventInfo?.groomName
                  ? `Para visualizar e escolher os presentes de ${eventInfo.brideName} & ${eventInfo.groomName}, é necessário estar logado e confirmar sua presença no evento.`
                  : 'Para visualizar a lista de presentes do casal, você precisa estar logado e confirmar sua presença no evento.'}
              </p>
            </div>

            {/* Etapas Obrigatórias */}
            <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-[#E5DFD5] text-left space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#2D2D2D] text-[#C5A059] font-extrabold flex items-center justify-center text-[11px]">
                    1
                  </span>
                  <span className="font-bold text-[#2D2D2D]">Fazer Login / Identificar-se</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Pendente
                </span>
              </div>

              <div className="border-t border-[#E5DFD5] pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#E5DFD5] text-[#2D2D2D]/70 font-extrabold flex items-center justify-center text-[11px]">
                    2
                  </span>
                  <span className="font-bold text-[#2D2D2D]/70">Confirmar Presença no Evento</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Bloqueado
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-4 px-6 bg-[#2D2D2D] hover:bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2.5 active:scale-95 cursor-pointer"
              >
                <User className="w-4 h-4 text-[#C5A059]" />
                <span>1. Fazer Login / Identificar-se Agora</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('casal')}
                className="w-full py-3 px-6 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] font-bold text-xs uppercase tracking-wider rounded-2xl border border-[#E5DFD5] transition cursor-pointer"
              >
                ← Voltar para o Perfil do Casal
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. Usuário ESTÁ logado, mas ainda NÃO confirmou presença: exigir confirmação de presença
    if (!isPresenceConfirmed) {
      if (rsvpDeclinedSubmitted) {
        return (
          <div className="max-w-lg mx-auto py-10 px-2 sm:px-0 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E5DFD5] shadow-xl text-center space-y-5">
              <div className="w-14 h-14 bg-stone-100 text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-stone-200">
                <Heart className="w-7 h-7 fill-current" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                  Resposta Registrada
                </span>
                <h2 className="text-2xl font-bold text-[#2D2D2D] pt-1">
                  Sentiremos sua falta! 💌
                </h2>
                <p className="text-xs sm:text-sm text-[#2D2D2D]/70 max-w-sm mx-auto leading-relaxed">
                  Registramos que você não poderá comparecer. A lista de presentes fica disponível apenas para convidados com presença confirmada.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setRsvpStatus('confirmed');
                    setRsvpDeclinedSubmitted(false);
                  }}
                  className="w-full py-3.5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md active:scale-95 cursor-pointer"
                >
                  Mudou de ideia? Confirmar Presença Agora
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('casal')}
                  className="w-full py-2.5 text-xs font-bold text-[#2D2D2D]/70 hover:text-[#2D2D2D] transition cursor-pointer"
                >
                  Voltar ao Perfil do Casal
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-lg mx-auto py-6 sm:py-10 px-2 sm:px-0 animate-fade-in font-sans">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-[#E5DFD5] shadow-xl space-y-6">
            
            {/* CARD HEADER */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#FAF9F6] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto border border-[#E5DFD5] shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C5A059] bg-[#FAF9F6] px-3.5 py-1 rounded-full border border-[#E5DFD5] inline-block">
                Passo 2 de 2 • Confirmação Obrigatória
              </span>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
                Confirme sua <span className="text-[#C5A059]">Presença</span>
              </h2>
              
              <p className="text-xs sm:text-sm text-[#2D2D2D]/75 leading-relaxed max-w-sm mx-auto">
                Olá, <strong>{guestSession.name}</strong>! Para desbloquear a lista de presentes{eventInfo?.brideName && eventInfo?.groomName ? ` de ${eventInfo.brideName} & ${eventInfo.groomName}` : ''}, confirme sua presença abaixo:
              </p>
            </div>

            {/* Status das Etapas */}
            <div className="bg-[#FAF9F6] rounded-2xl p-3.5 border border-[#E5DFD5] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1. Login Concluído ({guestSession.name})</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                2. Falta Confirmar Presença
              </span>
            </div>

            {/* RSVP FORM */}
            <form onSubmit={handleRsvpSubmit} className="space-y-4">
              {rsvpError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-medium">
                  {rsvpError}
                </div>
              )}

              {/* Presença Sim / Não */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label 
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                    rsvpStatus === 'confirmed' 
                      ? 'border-[#C5A059] bg-[#FAF9F6] text-[#2D2D2D] font-bold shadow-xs ring-1 ring-[#C5A059]/40' 
                      : 'border-[#E5DFD5] bg-white hover:border-[#C5A059]/50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="rsvpStatus" 
                    value="confirmed" 
                    checked={rsvpStatus === 'confirmed'} 
                    onChange={() => setRsvpStatus('confirmed')}
                    className="w-4 h-4 text-[#C5A059] focus:ring-[#C5A059]"
                  />
                  <span className="text-xs leading-tight">Sim, com certeza vou! 🎉</span>
                </label>

                <label 
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center space-x-2.5 ${
                    rsvpStatus === 'declined' 
                      ? 'border-[#2D2D2D]/40 bg-stone-50 text-[#2D2D2D] font-bold shadow-xs' 
                      : 'border-[#E5DFD5] bg-white hover:border-[#2D2D2D]/30'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="rsvpStatus" 
                    value="declined" 
                    checked={rsvpStatus === 'declined'} 
                    onChange={() => setRsvpStatus('declined')}
                    className="w-4 h-4 text-[#2D2D2D] focus:ring-[#2D2D2D]"
                  />
                  <span className="text-xs leading-tight">Infelizmente não vou 💔</span>
                </label>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                  Seu Nome Completo <span className="text-[#C5A059]">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Beatriz Silva"
                  value={rsvpName}
                  onChange={e => setRsvpName(e.target.value)}
                  className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                />
              </div>

              {/* Acompanhantes e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                    Acompanhantes
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRsvpCompanions(Math.max(0, rsvpCompanions - 1))}
                      className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5] text-[#2D2D2D] font-bold flex items-center justify-center hover:bg-[#F2ECE4] transition"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-xs">
                      {rsvpCompanions} {rsvpCompanions === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRsvpCompanions(rsvpCompanions + 1)}
                      className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5] text-[#2D2D2D] font-bold flex items-center justify-center hover:bg-[#F2ECE4] transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                    WhatsApp / Telefone (opcional)
                  </label>
                  <input 
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={rsvpPhone}
                    onChange={e => setRsvpPhone(e.target.value)}
                    className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              {/* Mensagem Opcional */}
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                  Recado para os noivos (opcional)
                </label>
                <textarea 
                  rows={2}
                  placeholder="Deixe uma mensagem de carinho..."
                  value={rsvpMessage}
                  onChange={e => setRsvpMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition resize-none"
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isSubmittingRsvp}
                className="w-full py-4 bg-[#C5A059] hover:bg-[#B38F48] text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer pt-3"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingRsvp ? 'Confirmando...' : 'Confirmar Presença e Liberar Presentes'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigate('casal')}
                className="text-[11px] font-bold text-[#2D2D2D]/60 hover:text-[#2D2D2D] hover:underline"
              >
                ← Voltar ao Perfil do Casal
              </button>
            </div>

          </div>
        </div>
      );
    }
  }

  // Active list items based on selected tab and filters
  const currentTabItems = activeTab === 'precisamos' ? neededGifts : acquiredGifts;

  const normalizeCategory = (cat?: string): GiftCategory => {
    if (cat && CATEGORIES.includes(cat as GiftCategory)) {
      return cat as GiftCategory;
    }
    return 'Mimos e Outros';
  };

  const filteredItems = currentTabItems.filter(g => {
    const normalizedCat = normalizeCategory(g.category);
    // Category filter
    if (selectedCategory !== 'all' && normalizedCat !== selectedCategory) return false;
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = (g.name || '').toLowerCase().includes(term);
      const matchDesc = g.description?.toLowerCase().includes(term);
      const matchCategory = normalizedCat.toLowerCase().includes(term);
      return matchName || matchDesc || matchCategory;
    }
    return true;
  });

  const percentageCompleted = gifts.length > 0 
    ? Math.round((acquiredGifts.length / gifts.length) * 100) 
    : 0;

  const displayedGuestName = guestSession?.name || rsvpName || 'Convidado';

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-14 animate-fade-in px-2 sm:px-0 font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5DFD5] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-2xs">
            <GiftIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#2D2D2D] leading-tight truncate">
              Lista de <span className="text-[#C5A059]">Presentes</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-[#2D2D2D]/65 truncate">
              {eventInfo?.brideName && eventInfo?.groomName 
                ? `Chá de Panela de ${eventInfo.brideName} & ${eventInfo.groomName}`
                : 'Enxoval do Casal'}
            </p>
          </div>
        </div>

        {hasBrideWhatsApp && (
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setIsCustomGiftModalOpen(true)}
              className="px-3.5 py-2.5 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="hidden sm:inline">Sugerir Presente</span>
              <span className="sm:hidden">Sugerir</span>
            </button>
          </div>
        )}
      </div>

      {/* USER LOGGED IN BAR */}
      <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 truncate">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[#2D2D2D]/70 text-[11px]">Presença confirmada:</span>
          <strong className="text-[#2D2D2D] font-bold text-[11px] truncate">{displayedGuestName}</strong>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] hover:underline shrink-0 ml-2 cursor-pointer"
        >
          Trocar
        </button>
      </div>

      {/* PROGRESS BAR SUMMARY */}
      <div className="bg-white border border-[#E5DFD5] rounded-xl p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-[#2D2D2D]/80">Resumo da Lista</span>
          </div>
          <span className="text-[11px] font-bold text-[#C5A059]">
            {neededGifts.length} {neededGifts.length === 1 ? 'disponível' : 'disponíveis'} • {acquiredGifts.length} de {gifts.length} {gifts.length === 1 ? 'garantido' : 'garantidos'} ({percentageCompleted}%)
          </span>
        </div>
        <div className="w-full bg-[#FAF9F6] rounded-full h-2 overflow-hidden border border-[#E5DFD5]">
          <div 
            className="bg-[#C5A059] h-full rounded-full transition-all duration-500" 
            style={{ width: `${percentageCompleted}%` }}
          />
        </div>
      </div>

      {/* RECADO / DICA GERAL DOS NOIVOS SOBRE OS PRESENTES */}
      {eventInfo?.giftPreferencesGuide && (
        <div className="bg-gradient-to-br from-[#FAF9F6] via-white to-[#F2ECE4] border border-[#C5A059]/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2 text-[#C5A059]">
            <Sparkles className="w-4 h-4 fill-current shrink-0" />
            <h3 className="font-serif italic font-bold text-sm sm:text-base text-[#2D2D2D]">
              Recadinho dos Noivos para a Escolha dos Presentes
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#2D2D2D]/85 leading-relaxed font-sans italic bg-white/80 p-3.5 rounded-xl border border-[#E5DFD5]">
            "{eventInfo.giftPreferencesGuide}"
          </p>
          <p className="text-[10px] text-[#2D2D2D]/55 font-sans">
            ✨ Dica do casal sobre a paleta de cores, estilo e preferências para os cômodos da casa nova!
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEUS PRESENTES ESCOLHIDOS (DESTAQUE NO TOPO SE O CONVIDADO JÁ RESERVOU)    */}
      {/* ========================================================================= */}
      {mySelectedGifts.length > 0 && (
        <div className="bg-emerald-50/90 rounded-2xl border border-emerald-300 shadow-2xs p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-emerald-950 flex items-center space-x-1.5">
                  <span>Seus Presentes Escolhidos</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    {mySelectedGifts.length} {mySelectedGifts.length === 1 ? 'item' : 'itens'}
                  </span>
                </h2>
                <p className="text-[10px] text-emerald-800">
                  Reservados em seu nome ({displayedGuestName}). Muito obrigado pelo carinho!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {mySelectedGifts.map(gift => {
              const isUnclaiming = unclaimingId === gift.id;

              return (
                <div 
                  key={gift.id}
                  className="bg-white border border-emerald-200 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-2.5 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {gift.imageUrl ? (
                      <img 
                        src={gift.imageUrl} 
                        alt={gift.name} 
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shrink-0 shadow-2xs" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600 shadow-2xs">
                        <GiftIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {gift.category}
                        </span>
                        <span className="text-[9px] text-emerald-700 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Garantido por você</span>
                        </span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-[#2D2D2D] break-words whitespace-normal pt-0.5">
                        {gift.name}
                      </h3>
                      {gift.priceRange && (
                        <p className="text-[10px] font-semibold text-[#C5A059]">
                          Faixa estimada: {gift.priceRange}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isUnclaiming}
                    onClick={() => handleUnclaim(gift)}
                    title="Desmarcar caso deseje escolher outro item"
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg transition flex items-center space-x-1 shrink-0 shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-3 h-3 ${isUnclaiming ? 'animate-spin' : ''}`} />
                    <span>{isUnclaiming ? '...' : 'Desmarcar'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABS SELECTOR: O QUE PRECISAMOS VS O QUE JÁ TEMOS                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('precisamos')}
          className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'precisamos'
              ? 'bg-[#2D2D2D] text-white shadow-md'
              : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D] hover:bg-white/60'
          }`}
        >
          <ListPlus className={`w-4 h-4 ${activeTab === 'precisamos' ? 'text-[#C5A059]' : 'text-[#2D2D2D]/50'}`} />
          <span className="truncate">O Que Precisamos</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeTab === 'precisamos' ? 'bg-[#C5A059] text-white' : 'bg-[#E5DFD5] text-[#2D2D2D]/80'
          }`}>
            {neededGifts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ja_temos')}
          className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'ja_temos'
              ? 'bg-[#2D2D2D] text-white shadow-md'
              : 'text-[#2D2D2D]/70 hover:text-[#2D2D2D] hover:bg-white/60'
          }`}
        >
          <PackageCheck className={`w-4 h-4 ${activeTab === 'ja_temos' ? 'text-[#C5A059]' : 'text-[#2D2D2D]/50'}`} />
          <span className="truncate">O Que Já Temos</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeTab === 'ja_temos' ? 'bg-[#C5A059] text-white' : 'bg-[#E5DFD5] text-[#2D2D2D]/80'
          }`}>
            {acquiredGifts.length}
          </span>
        </button>
      </div>

      {/* SEARCH AND CATEGORY FILTER */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
          <input 
            type="text"
            placeholder={
              activeTab === 'precisamos'
                ? "Buscar itens disponíveis para presentear..."
                : "Buscar itens que os noivos já têm..."
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs border border-[#E5DFD5] bg-white rounded-xl focus:border-[#C5A059] outline-none shadow-2xs transition font-sans"
          />
        </div>

        {/* CATEGORY CHIPS */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-[#2D2D2D] text-white border-[#2D2D2D]'
                : 'bg-white text-[#2D2D2D]/70 border-[#E5DFD5] hover:bg-[#FAF9F6]'
            }`}
          >
            Todas Categorias
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#C5A059] text-white border-[#C5A059]'
                  : 'bg-white text-[#2D2D2D]/70 border-[#E5DFD5] hover:bg-[#FAF9F6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 1: O QUE PRECISAMOS (DISPONÍVEIS)                         */}
      {/* ========================================================================= */}
      {activeTab === 'precisamos' && (
        <div className="space-y-4">
          <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-xl p-3 flex items-start space-x-2.5">
            <Heart className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5 fill-current" />
            <div className="text-xs text-[#2D2D2D]/75 space-y-0.5">
              <p className="font-bold text-[#2D2D2D]">
                Itens disponíveis para escolha ({neededGifts.length} itens)
              </p>
              <p className="text-[11px] leading-relaxed text-[#2D2D2D]/65">
                Estes são os presentes que os noivos precisam para a casa nova. Toque no item para ver detalhes e clique em <strong>Garantir Presente</strong> para reservá-lo instantaneamente.
              </p>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-[#E5DFD5] rounded-2xl p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-sm text-[#2D2D2D]">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Nenhum presente disponível encontrado com este filtro'
                  : gifts.length === 0
                    ? 'A lista de presentes ainda está sendo preparada pelos noivos'
                    : 'Todos os presentes já foram escolhidos! 🎉'}
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 max-w-sm mx-auto">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Tente buscar por outro termo ou limpar o filtro de categoria.'
                  : gifts.length === 0
                    ? 'Em breve novos itens estarão disponíveis aqui. Você também pode sugerir um presente especial clicando no botão acima!'
                    : 'Todos os itens necessários foram garantidos pelos convidados! Você também pode sugerir um presente especial.'}
              </p>
              {(searchTerm || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="mt-2 text-xs font-bold text-[#C5A059] hover:underline"
                >
                  Limpar Filtro
                </button>
              )}
            </div>
          ) : (
            CATEGORIES.map(category => {
              const categoryGifts = filteredItems.filter(g => normalizeCategory(g.category) === category);
              if (categoryGifts.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  {/* CATEGORY HEADER */}
                  <div className="flex items-center justify-between pt-2 pb-1 border-b border-[#E5DFD5]">
                    <h3 className="font-bold text-xs text-[#2D2D2D] uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                      <span>{category}</span>
                    </h3>
                    <span className="text-[9px] font-bold text-[#2D2D2D]/60 bg-[#F2ECE4] px-2 py-0.5 rounded-full">
                      {categoryGifts.length} {categoryGifts.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* GIFTS LIST ACCORDIONS */}
                  <div className="space-y-2">
                    {categoryGifts.map(gift => {
                      const isClaimingThis = claimingId === gift.id;
                      const isItemExpanded = expandedGiftIds[gift.id] ?? false;

                      return (
                        <div 
                          key={gift.id}
                          className={`bg-white border rounded-xl overflow-hidden transition-all shadow-2xs ${
                            isItemExpanded ? 'border-[#C5A059] ring-1 ring-[#C5A059]/30' : 'border-[#E5DFD5] hover:border-[#C5A059]/60'
                          }`}
                        >
                          {/* ACCORDION HEADER */}
                          <button
                            type="button"
                            onClick={() => toggleGiftAccordion(gift.id)}
                            className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition cursor-pointer gap-2.5"
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {gift.imageUrl ? (
                                <img 
                                  src={gift.imageUrl} 
                                  alt={gift.name} 
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E5DFD5] shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5] flex items-center justify-center shrink-0 text-[#C5A059] shadow-2xs">
                                  <GiftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                              )}
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <h4 className="font-bold text-xs sm:text-sm text-[#2D2D2D] leading-snug break-words whitespace-normal">
                                  {gift.name}
                                </h4>
                                {gift.priceRange && (
                                  <span className="text-[10px] text-[#C5A059] font-semibold block pt-0.5">
                                    Faixa: {gift.priceRange}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hidden sm:inline">
                                {isItemExpanded ? 'Recolher' : 'Detalhes'}
                              </span>
                              <div className="w-7 h-7 rounded-full bg-[#FAF9F6] border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
                                {isItemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>

                          {/* ACCORDION CONTENT */}
                          {isItemExpanded && (
                            <div className="p-3.5 pt-2 border-t border-[#E5DFD5] bg-[#FAF9F6] space-y-3 text-xs">
                              {gift.imageUrl && (
                                <div className="rounded-xl overflow-hidden border border-[#E5DFD5] bg-white p-2 shadow-2xs max-w-xs mx-auto sm:mx-0">
                                  <img 
                                    src={gift.imageUrl} 
                                    alt={gift.name} 
                                    className="w-full max-h-56 object-contain rounded-lg bg-[#FAF9F6]" 
                                  />
                                </div>
                              )}

                              {gift.description ? (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-[#2D2D2D]/60 uppercase tracking-wider block">
                                    Descrição / Detalhes:
                                  </span>
                                  <p className="text-xs text-[#2D2D2D]/80 leading-relaxed font-sans break-words whitespace-normal bg-white p-3 rounded-xl border border-[#E5DFD5]">
                                    {gift.description}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-[#2D2D2D]/50 italic bg-white p-2.5 rounded-xl border border-[#E5DFD5]">
                                  Sem descrição adicional informada.
                                </p>
                              )}

                              {gift.suggestedUrl && (
                                <div className="pt-0.5">
                                  <a 
                                    href={gift.suggestedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center space-x-1.5 text-[#C5A059] hover:text-[#B38F48] bg-white px-3 py-2 rounded-xl border border-[#E5DFD5] text-[11px] font-bold shadow-2xs transition active:scale-95"
                                  >
                                    <span>Ver sugestão de compra em loja online</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                                  </a>
                                </div>
                              )}

                              {/* ACTION BUTTON - GARANTIR PRESENTE */}
                              <div className="pt-2 border-t border-[#E5DFD5] flex items-center justify-between gap-2">
                                <span className="text-[10px] text-[#2D2D2D]/60 font-sans italic hidden sm:inline">
                                  Deseja presentear este item?
                                </span>
                                <button
                                  type="button"
                                  disabled={isClaimingThis}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDirectClaim(gift);
                                  }}
                                  className="w-full sm:w-auto px-4 py-2.5 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50 ml-auto cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                                  <span>{isClaimingThis ? 'Reservando...' : 'Garantir Presente'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEÚDO DA ABA 2: O QUE JÁ TEMOS (GARANTIDOS / GANHOS)                   */}
      {/* SEM EXPOR O CONVIDADO QUE ESCOLHEU O PRESENTE                             */}
      {/* ========================================================================= */}
      {activeTab === 'ja_temos' && (
        <div className="space-y-4">
          <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-xl p-3 flex items-start space-x-2.5">
            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#2D2D2D]/75 space-y-0.5">
              <p className="font-bold text-[#2D2D2D]">
                Itens já garantidos para o casal ({acquiredGifts.length} itens)
              </p>
              <p className="text-[11px] leading-relaxed text-[#2D2D2D]/65">
                Estes presentes já foram escolhidos e garantidos. Não é possível selecionar um presente que já foi escolhido por outro convidado.
              </p>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-[#E5DFD5] rounded-2xl p-8 text-center space-y-2">
              <GiftIcon className="w-8 h-8 text-[#C5A059]/50 mx-auto" />
              <h3 className="font-bold text-sm text-[#2D2D2D]">
                Nenhum presente garantido ainda
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 max-w-sm mx-auto">
                Acesse a aba <strong>O Que Precisamos</strong> e seja um dos primeiros a escolher um presente especial para os noivos!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('precisamos')}
                className="mt-3 px-4 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-2xs inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Ver Itens Necessários</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            CATEGORIES.map(category => {
              const categoryGifts = filteredItems.filter(g => normalizeCategory(g.category) === category);
              if (categoryGifts.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  {/* CATEGORY HEADER */}
                  <div className="flex items-center justify-between pt-2 pb-1 border-b border-[#E5DFD5]">
                    <h3 className="font-bold text-xs text-[#2D2D2D] uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>{category}</span>
                    </h3>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {categoryGifts.length} {categoryGifts.length === 1 ? 'já garantido' : 'já garantidos'}
                    </span>
                  </div>

                  {/* ACQUIRED GIFTS LIST (ANONYMIZED - NO GUEST EXPOSURE) */}
                  <div className="space-y-2">
                    {categoryGifts.map(gift => {
                      const currentName = guestSession?.name || rsvpName;
                      const isClaimedByCurrentGuest = Boolean(currentName && 
                        gift.claimedByGuestName?.trim().toLowerCase() === currentName.trim().toLowerCase());
                      const isUnclaiming = unclaimingId === gift.id;

                      return (
                        <div 
                          key={gift.id}
                          className={`rounded-xl p-3.5 transition border ${
                            isClaimedByCurrentGuest
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-white border-[#E5DFD5] opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              {gift.imageUrl ? (
                                <img 
                                  src={gift.imageUrl} 
                                  alt={gift.name} 
                                  className="w-12 h-12 rounded-xl object-cover border border-[#E5DFD5] shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5] flex items-center justify-center shrink-0 text-[#C5A059] shadow-2xs">
                                  <GiftIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="text-[8px] font-bold text-[#2D2D2D]/60 uppercase tracking-wider bg-[#FAF9F6] px-2 py-0.5 rounded-full border border-[#E5DFD5]">
                                    {gift.category}
                                  </span>
                                  
                                  {isClaimedByCurrentGuest ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Escolhido por você</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium text-[#2D2D2D]/75 bg-[#F2ECE4] border border-[#E5DFD5] px-2 py-0.5 rounded-full flex items-center space-x-1">
                                      <Lock className="w-2.5 h-2.5 text-[#C5A059]" />
                                      <span>Já garantido para o casal</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-bold text-xs sm:text-sm text-[#2D2D2D] leading-snug break-words whitespace-normal pt-0.5">
                                  {gift.name}
                                </h4>

                                {gift.description && (
                                  <p className="text-[11px] text-[#2D2D2D]/65 line-clamp-2">
                                    {gift.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* RIGHT ACTION: IF MINE, SHOW DESMARCAR; IF ANOTHER'S, SHOW INDISPONÍVEL */}
                            <div className="shrink-0 pt-0.5">
                              {isClaimedByCurrentGuest ? (
                                <button
                                  type="button"
                                  disabled={isUnclaiming}
                                  onClick={() => handleUnclaim(gift)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg transition flex items-center space-x-1 shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                  <RotateCcw className={`w-3 h-3 ${isUnclaiming ? 'animate-spin' : ''}`} />
                                  <span>{isUnclaiming ? '...' : 'Desmarcar'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-[#2D2D2D]/60 bg-[#FAF9F6] border border-[#E5DFD5] px-2.5 py-1 rounded-lg inline-block">
                                  Indisponível
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CUSTOM GIFT MODAL - SUGGEST TO BRIDE'S WHATSAPP */}
      <CustomGiftModal
        isOpen={isCustomGiftModalOpen}
        guestName={displayedGuestName}
        isGuestView={true}
        brideName={eventInfo?.brideName}
        bridePhone={eventInfo?.bridePhone}
        pixKey={eventInfo?.pixKey}
        onClose={() => setIsCustomGiftModalOpen(false)}
      />
    </div>
  );
};
