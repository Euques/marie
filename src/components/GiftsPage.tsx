import React, { useState, useMemo } from 'react';
import { Gift, GiftCategory, GuestAuthSession } from '../types';
import { CustomGiftModal } from './CustomGiftModal';
import { 
  Gift as GiftIcon, Search, Sparkles, Lock, Unlock, 
  ChevronDown, ChevronUp, Plus, Heart, User, CheckCircle2,
  RotateCcw, ExternalLink, ShoppingBag, ArrowLeft
} from 'lucide-react';

interface GiftsPageProps {
  gifts: Gift[];
  guestSession: GuestAuthSession | null;
  onClaimGift: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
  onUnclaimGift: (giftId: string) => Promise<void>;
  onAddCustomGift: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  onNavigate: (route: 'home' | 'presentes' | 'login' | 'noiva') => void;
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
  onClaimGift,
  onUnclaimGift,
  onAddCustomGift,
  onNavigate
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);

  // Expanded items state (each gift card is an accordion)
  const [expandedGiftIds, setExpandedGiftIds] = useState<Record<string, boolean>>({});

  // Accordion for third-party claimed gifts section
  const [isOthersSectionOpen, setIsOthersSectionOpen] = useState(false);

  // Custom Gift Modal
  const [isCustomGiftModalOpen, setIsCustomGiftModalOpen] = useState(false);

  // Filter gifts into 3 groups:
  // 1. My Selected Gifts (Selected by current guest)
  // 2. Available Gifts (Not claimed by anyone)
  // 3. Other Guests' Selected Gifts (Claimed by someone else)

  const mySelectedGifts = useMemo(() => {
    if (!guestSession) return [];
    return gifts.filter(g => 
      g.isClaimed && g.claimedByGuestName?.toLowerCase() === guestSession.name.toLowerCase()
    );
  }, [gifts, guestSession]);

  const availableGifts = useMemo(() => {
    return gifts.filter(g => !g.isClaimed);
  }, [gifts]);

  const otherSelectedGifts = useMemo(() => {
    if (!guestSession) return gifts.filter(g => g.isClaimed);
    return gifts.filter(g => 
      g.isClaimed && g.claimedByGuestName?.toLowerCase() !== guestSession.name.toLowerCase()
    );
  }, [gifts, guestSession]);

  const toggleGiftAccordion = (giftId: string) => {
    setExpandedGiftIds(prev => ({ ...prev, [giftId]: !prev[giftId] }));
  };

  // Direct 1-Click Gift Selection
  const handleDirectClaim = async (gift: Gift) => {
    if (!guestSession) return;
    try {
      setClaimingId(gift.id);
      await onClaimGift(gift.id, {
        guestName: guestSession.name,
        guestEmail: guestSession.email || undefined
      });
    } catch (err) {
      console.error('Erro ao selecionar presente:', err);
    } finally {
      setClaimingId(null);
    }
  };

  // Unclaim/Desmarcar Gift Handler
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

  /* IF NOT LOGGED IN: PROMPT TO ACCEPT INVITATION */
  if (!guestSession) {
    return (
      <div className="max-w-md mx-auto py-12 px-2 sm:px-0 animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-[#E5DFD5] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] bg-[#F2ECE4] px-3 py-1 rounded-full border border-[#E5DFD5]">
              Área Exclusiva
            </span>
            <h2 className="text-2xl font-bold text-[#2D2D2D]">
              Lista de <span className="text-[#C5A059]">Presentes</span>
            </h2>
            <p className="text-xs text-[#2D2D2D]/70 leading-relaxed max-w-xs mx-auto">
              A lista de presentes dos noivos está visível exclusivamente para convidados identificados.
            </p>
          </div>

          <button
            onClick={() => onNavigate('login')}
            className="w-full py-4 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-[#C5A059]" />
            <span>Aceitar Convite / Entrar</span>
          </button>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-3 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in px-2 sm:px-0 font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-white rounded-2xl p-4 border border-[#E5DFD5] shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-2xs">
            <GiftIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#2D2D2D] leading-tight truncate">
              Lista de <span className="text-[#C5A059]">Presentes</span>
            </h1>
            <p className="text-[11px] text-[#2D2D2D]/60 truncate">
              Toque no item para ver detalhes
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="px-3.5 py-2 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] font-bold text-xs rounded-xl transition flex items-center space-x-1.5 active:scale-95 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
            <span>Voltar</span>
          </button>
          <button
            onClick={() => setIsCustomGiftModalOpen(true)}
            className="px-3 py-2 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[11px] rounded-xl transition flex items-center space-x-1 shadow-2xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Sugerir</span>
          </button>
        </div>
      </div>

      {/* USER LOGGED IN BAR */}
      <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 truncate">
          <User className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
          <span className="text-[#2D2D2D]/70 text-[11px]">Convidado:</span>
          <strong className="text-[#2D2D2D] font-bold text-[11px] truncate">{guestSession.name}</strong>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] hover:underline shrink-0 ml-2"
        >
          Trocar
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
        <input 
          type="text"
          placeholder="Buscar presente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs border border-[#E5DFD5] bg-white rounded-xl focus:border-[#C5A059] outline-none shadow-2xs transition font-sans"
        />
      </div>


      {/* ========================================================================= */}
      {/* 1º: ITENS SELECIONADOS PELO CONVIDADO                                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-emerald-950 flex items-center space-x-1.5">
                <span>Seus Presentes</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {mySelectedGifts.length}
                </span>
              </h2>
              <p className="text-[10px] text-emerald-700">
                Itens reservados em seu nome
              </p>
            </div>
          </div>
        </div>

        {mySelectedGifts.length === 0 ? (
          <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-xl p-3.5 text-center space-y-0.5">
            <Heart className="w-5 h-5 text-[#C5A059]/60 mx-auto" />
            <p className="text-xs font-semibold text-[#2D2D2D]">
              Nenhum item selecionado ainda
            </p>
            <p className="text-[10px] text-[#2D2D2D]/60">
              Escolha um item da lista abaixo para presentear os noivos!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mySelectedGifts.map(gift => {
              const isUnclaiming = unclaimingId === gift.id;

              return (
                <div 
                  key={gift.id}
                  className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 transition shadow-2xs flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider bg-white px-2 py-0.2 rounded-full border border-emerald-200">
                        {gift.category}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Reservado</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-emerald-950 break-words whitespace-normal">
                      {gift.name}
                    </h3>
                    {gift.priceRange && (
                      <p className="text-[10px] font-semibold text-[#C5A059]">
                        {gift.priceRange}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isUnclaiming}
                    onClick={() => handleUnclaim(gift)}
                    className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg transition flex items-center space-x-1 shrink-0 shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isUnclaiming ? 'animate-spin' : ''}`} />
                    <span>{isUnclaiming ? '...' : 'Desmarcar'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* ========================================================================= */}
      {/* 2º: LISTA DE PRODUTOS DISPONÍVEIS (CADA PRODUTO É UM ACCORDION)             */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-[#2D2D2D] flex items-center space-x-1.5">
              <GiftIcon className="w-4 h-4 text-[#C5A059]" />
              <span>Presentes Disponíveis ({availableGifts.length})</span>
            </h2>
            <p className="text-[10px] text-[#2D2D2D]/60 font-sans">
              Toque no item para expandir detalhes e garantir
            </p>
          </div>
        </div>

        {CATEGORIES.map(category => {
          const categoryGifts = availableGifts.filter(g => {
            if (g.category !== category) return false;
            if (searchTerm.trim()) {
              const term = searchTerm.toLowerCase();
              return g.name.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term);
            }
            return true;
          });

          if (categoryGifts.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              {/* CATEGORY SECTION HEADER */}
              <div className="flex items-center justify-between pt-1 pb-1 border-b border-[#E5DFD5]">
                <h3 className="font-bold text-xs text-[#2D2D2D] uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                  <span>{category}</span>
                </h3>
                <span className="text-[9px] font-bold text-[#2D2D2D]/60 bg-[#F2ECE4] px-2 py-0.5 rounded-full">
                  {categoryGifts.length} {categoryGifts.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* ACCORDIONS LIST */}
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
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FAF9F6] transition cursor-pointer gap-2.5"
                      >
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

                          {/* ACTION BUTTON */}
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
                              className="w-full sm:w-auto px-4 py-2.5 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50 ml-auto"
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
        })}
      </div>


      {/* ========================================================================= */}
      {/* 3º: PRODUTOS RESERVADOS POR OUTROS CONVIDADOS                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-[#E5DFD5] shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOthersSectionOpen(!isOthersSectionOpen)}
          className="w-full p-3 bg-[#FAF9F6] hover:bg-[#F2ECE4] flex items-center justify-between transition text-left cursor-pointer"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Lock className="w-3.5 h-3.5 text-[#2D2D2D]/60 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-[#2D2D2D] truncate">
                Reservados por Outros ({otherSelectedGifts.length})
              </h3>
            </div>
          </div>

          <div className="text-[#2D2D2D]/60 shrink-0 ml-2">
            {isOthersSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isOthersSectionOpen && (
          <div className="p-3 space-y-2 bg-white border-t border-[#E5DFD5]">
            {otherSelectedGifts.length === 0 ? (
              <p className="text-[11px] text-[#2D2D2D]/50 italic text-center py-1">
                Nenhum item foi reservado por outros convidados ainda.
              </p>
            ) : (
              otherSelectedGifts.map(gift => (
                <div 
                  key={gift.id}
                  className="p-2.5 bg-[#FAF9F6] border border-[#E5DFD5] rounded-lg flex items-center justify-between text-xs opacity-75"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[8px] font-bold text-[#2D2D2D]/50 uppercase tracking-wider bg-white px-1.5 py-0.2 rounded-md border border-[#E5DFD5]">
                      {gift.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#2D2D2D] truncate mt-0.5">
                      {gift.name}
                    </h4>
                  </div>
                  <span className="text-[9px] text-[#2D2D2D]/70 bg-white px-2 py-0.5 rounded-md border border-[#E5DFD5] font-medium shrink-0">
                    🔒 {gift.claimedByGuestName || 'Reservado'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>


      {/* CUSTOM GIFT MODAL */}
      <CustomGiftModal
        isOpen={isCustomGiftModalOpen}
        guestName={guestSession.name}
        onClose={() => setIsCustomGiftModalOpen(false)}
        onSubmit={async (data) => {
          await onAddCustomGift(data);
          setIsCustomGiftModalOpen(false);
        }}
      />
    </div>
  );
};
