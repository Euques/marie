import React, { useState, useMemo } from 'react';
import { EventInfo, Gift, GiftCategory, Guest } from '../types';
import { ClaimGiftModal } from './ClaimGiftModal';
import { CustomGiftModal } from './CustomGiftModal';
import { 
  Heart, Calendar, Clock, MapPin, Copy, Check, ExternalLink, 
  Gift as GiftIcon, Search, Filter, Sparkles, QrCode, MessageCircle, 
  Send, Users, CheckCircle2, User, ChevronDown, Phone, Mail
} from 'lucide-react';

interface GuestViewProps {
  eventInfo: EventInfo;
  gifts: Gift[];
  guests: Guest[];
  onClaimGift: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
  onAddCustomGift: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  onSubmitRsvp: (data: { name: string; email?: string; phone?: string; companions: number; status: 'confirmed' | 'declined'; message?: string }) => Promise<void>;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const GuestView: React.FC<GuestViewProps> = ({
  eventInfo,
  gifts,
  guests,
  onClaimGift,
  onAddCustomGift,
  onSubmitRsvp
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'claimed'>('available');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedGiftToClaim, setSelectedGiftToClaim] = useState<Gift | null>(null);
  const [isCustomGiftModalOpen, setIsCustomGiftModalOpen] = useState(false);

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpCompanions, setRsvpCompanions] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  // Copy states
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Countdown calculations
  const daysLeft = useMemo(() => {
    if (!eventInfo.date) return null;
    const eventDate = new Date(eventInfo.date + 'T' + (eventInfo.time || '12:00'));
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [eventInfo.date, eventInfo.time]);

  // Filtered Gifts
  const filteredGifts = useMemo(() => {
    return gifts.filter(gift => {
      // Category filter
      if (selectedCategory !== 'Todas' && gift.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'available' && gift.isClaimed) {
        return false;
      }
      if (statusFilter === 'claimed' && !gift.isClaimed) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = gift.name.toLowerCase().includes(term);
        const matchesDesc = gift.description?.toLowerCase().includes(term);
        const matchesCat = gift.category.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [gifts, selectedCategory, statusFilter, searchTerm]);

  // Stats
  const availableCount = gifts.filter(g => !g.isClaimed).length;
  const totalCount = gifts.length;

  const handleCopyPix = () => {
    if (!eventInfo.pixKey) return;
    navigator.clipboard.writeText(eventInfo.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCopyAddress = () => {
    if (!eventInfo.location) return;
    navigator.clipboard.writeText(eventInfo.location);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 3000);
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) {
      setRsvpError('Por favor, informe seu nome completo.');
      return;
    }

    try {
      setRsvpLoading(true);
      setRsvpError('');
      await onSubmitRsvp({
        name: rsvpName.trim(),
        email: rsvpEmail.trim() || undefined,
        phone: rsvpPhone.trim() || undefined,
        companions: Number(rsvpCompanions) || 0,
        status: rsvpStatus,
        message: rsvpMessage.trim() || undefined
      });
      setRsvpSubmitted(true);
    } catch (err: any) {
      setRsvpError(err.message || 'Erro ao enviar confirmação. Tente novamente.');
    } finally {
      setRsvpLoading(false);
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch {
      return dateStr;
    }
    return dateStr;
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Banner Section */}
      <section className="relative rounded-sm overflow-hidden shadow-sm bg-[#F2ECE4] border border-[#E5DFD5]">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {eventInfo.coverImage && (
          <div className="absolute inset-0 opacity-15 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: `url(${eventInfo.coverImage})` }}></div>
        )}

        <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-16 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#FAF9F6] text-[#C5A059] text-[10px] font-semibold uppercase tracking-[0.25em] border border-[#E5DFD5]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chá de Panela</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#2D2D2D] tracking-tight leading-tight">
              {eventInfo.eventTitle || 'Chá de Panela'}
            </h1>
            <p className="font-serif text-2xl sm:text-3xl text-[#C5A059] italic">
              {eventInfo.brideName} <span className="not-italic text-[#2D2D2D]/40">&</span> {eventInfo.groomName}
            </p>
          </div>

          {eventInfo.welcomeMessage && (
            <p className="text-[#2D2D2D]/80 max-w-2xl mx-auto text-sm leading-relaxed font-sans bg-[#FAF9F6] p-4 rounded-sm border border-[#E5DFD5] shadow-2xs">
              "{eventInfo.welcomeMessage}"
            </p>
          )}

          {/* Countdown & Quick Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            {daysLeft !== null && daysLeft >= 0 && (
              <div className="bg-[#FAF9F6] px-5 py-2.5 rounded-sm border border-[#E5DFD5] flex items-center space-x-3">
                <div className="p-2 bg-[#F2ECE4] text-[#C5A059] rounded-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block text-[9px] font-semibold text-[#2D2D2D]/60 uppercase tracking-widest">Contagem Regressiva</span>
                  <span className="text-sm font-serif font-bold text-[#C5A059]">
                    {daysLeft === 0 ? '🎉 É HOJE!' : `Faltam ${daysLeft} dia${daysLeft > 1 ? 's' : ''}!`}
                  </span>
                </div>
              </div>
            )}

            <a 
              href="#confirmar-presenca"
              className="px-6 py-3 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm shadow-2xs transition flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />
              <span>Confirmar Presença</span>
            </a>

            <a 
              href="#lista-presentes"
              className="px-6 py-3 bg-[#FAF9F6] hover:bg-white text-[#2D2D2D] font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm border border-[#E5DFD5] transition flex items-center space-x-2"
            >
              <GiftIcon className="w-4 h-4 text-[#C5A059]" />
              <span>Lista de Presentes ({availableCount})</span>
            </a>
          </div>
        </div>
      </section>

      {/* Info Cards Grid (Data, Local, PIX) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date & Time Card */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-[#E5DFD5] flex flex-col justify-between space-y-4 hover:border-[#C5A059] transition">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#F2ECE4] text-[#C5A059] rounded-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-[#2D2D2D] text-lg">Data e Horário</h3>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/50">Marque no calendário</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-sm font-semibold text-[#2D2D2D] capitalize">
              {formatDateString(eventInfo.date) || 'Data a definir'}
            </p>
            <p className="text-xs text-[#2D2D2D]/70 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Horário: {eventInfo.time || '15:30'}h</span>
            </p>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-[#E5DFD5] flex flex-col justify-between space-y-4 hover:border-[#C5A059] transition">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#F2ECE4] text-[#C5A059] rounded-2xs">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-[#2D2D2D] text-lg">Local do Chá</h3>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/50">Endereço do evento</p>
            </div>
          </div>

          <p className="text-xs text-[#2D2D2D]/80 leading-relaxed font-medium">
            {eventInfo.location || 'Espaço a confirmar'}
          </p>

          <div className="flex items-center space-x-2 pt-1">
            {eventInfo.googleMapsUrl && (
              <a
                href={eventInfo.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white bg-[#2D2D2D] hover:bg-black rounded-sm transition flex items-center justify-center space-x-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Google Maps</span>
              </a>
            )}
            <button
              onClick={handleCopyAddress}
              title="Copiar Endereço"
              className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D] bg-[#F2ECE4] hover:bg-[#FAF9F6] border border-[#E5DFD5] rounded-sm transition flex items-center space-x-1"
            >
              {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAddress ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* PIX Gift Card */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-[#E5DFD5] flex flex-col justify-between space-y-4 hover:border-[#C5A059] transition">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#F2ECE4] text-[#C5A059] rounded-2xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-[#2D2D2D] text-lg">Presente em PIX</h3>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/50">Mimo para a nova casa</p>
            </div>
          </div>

          {eventInfo.pixKey ? (
            <div className="space-y-2 pt-1">
              <div className="bg-[#FAF9F6] p-2.5 rounded-sm border border-[#E5DFD5] font-mono text-xs text-[#2D2D2D] break-all">
                {eventInfo.pixKey}
              </div>
              <p className="text-[10px] text-[#2D2D2D]/60 uppercase tracking-wider">
                Titular: <span className="font-semibold text-[#2D2D2D]">{eventInfo.pixName}</span>
              </p>
              <button
                onClick={handleCopyPix}
                className="w-full py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white bg-[#C5A059] hover:bg-[#B38F48] rounded-sm shadow-2xs transition flex items-center justify-center space-x-1.5"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Chave Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Chave PIX</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#2D2D2D]/50 italic">Consulte os noivos para chave PIX</p>
          )}
        </div>
      </section>

      {/* Confirmação de Presença (RSVP) */}
      <section id="confirmar-presenca" className="bg-white rounded-sm shadow-sm border border-[#E5DFD5] p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-[#F2ECE4] text-[#C5A059] rounded-2xs mb-1">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2D2D2D]">
              Confirmação de Presença <span className="italic text-[#C5A059]">(RSVP)</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#2D2D2D]/60 font-sans">
              Por favor, confirme se você e seus acompanhantes poderão comemorar conosco!
            </p>
          </div>

          {rsvpSubmitted ? (
            <div className="bg-[#FAF9F6] border border-[#C5A059] rounded-sm p-6 text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 bg-[#F2ECE4] text-[#C5A059] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif italic font-bold text-[#2D2D2D] text-lg">Confirmação Recebida com Sucesso!</h3>
              <p className="text-xs sm:text-sm text-[#2D2D2D]/80 max-w-md mx-auto">
                Muito obrigado, <span className="font-semibold">{rsvpName}</span>! Sua resposta foi registrada com carinho.
              </p>
              <button
                onClick={() => {
                  setRsvpSubmitted(false);
                  setRsvpName('');
                  setRsvpPhone('');
                  setRsvpEmail('');
                  setRsvpMessage('');
                }}
                className="mt-2 text-xs font-semibold text-[#C5A059] underline hover:text-[#2D2D2D]"
              >
                Enviar outra confirmação
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="space-y-4 pt-2">
              {rsvpError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-sm border border-rose-200 font-medium">
                  {rsvpError}
                </div>
              )}

              {/* Status Radio Choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label 
                  className={`p-4 rounded-sm border cursor-pointer transition flex items-center space-x-3 ${
                    rsvpStatus === 'confirmed' 
                      ? 'border-[#C5A059] bg-[#F2ECE4] text-[#2D2D2D]' 
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
                  <div>
                    <span className="font-semibold text-sm block">Sim, com certeza vou! 🎉</span>
                    <span className="text-xs text-[#2D2D2D]/60">Estarei presente para comemorar</span>
                  </div>
                </label>

                <label 
                  className={`p-4 rounded-sm border cursor-pointer transition flex items-center space-x-3 ${
                    rsvpStatus === 'declined' 
                      ? 'border-[#2D2D2D]/40 bg-[#FAF9F6] text-[#2D2D2D]' 
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
                  <div>
                    <span className="font-semibold text-sm block">Infelizmente não poderei ir 💔</span>
                    <span className="text-xs text-[#2D2D2D]/60">Mando meus melhores votos ao casal</span>
                  </div>
                </label>
              </div>

              {/* Form Inputs */}
              <div>
                <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                  Seu Nome Completo <span className="text-[#C5A059]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Beatriz Lima"
                    value={rsvpName}
                    onChange={e => setRsvpName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-sm focus:border-[#C5A059] outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                    WhatsApp / Celular
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
                    <input 
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={rsvpPhone}
                      onChange={e => setRsvpPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-sm focus:border-[#C5A059] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                    Número de Acompanhantes
                  </label>
                  <select
                    value={rsvpCompanions}
                    onChange={e => setRsvpCompanions(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-[#E5DFD5] rounded-sm focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
                  >
                    <option value={0}>Apenas eu (0 acompanhantes)</option>
                    <option value={1}>+ 1 acompanhante</option>
                    <option value={2}>+ 2 acompanhantes</option>
                    <option value={3}>+ 3 acompanhantes</option>
                    <option value={4}>+ 4 ou mais</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                  Mensagem aos Noivos (Opcional)
                </label>
                <textarea 
                  rows={2}
                  placeholder="Deixe um carinho para a noiva..."
                  value={rsvpMessage}
                  onChange={e => setRsvpMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-sm focus:border-[#C5A059] outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={rsvpLoading}
                className="w-full py-3 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#C5A059]" />
                <span>{rsvpLoading ? 'Enviando resposta...' : 'Enviar Confirmação'}</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Lista de Presentes Interativa */}
      <section id="lista-presentes" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DFD5] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <GiftIcon className="w-6 h-6 text-[#C5A059]" />
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2D2D2D]">
                Lista de <span className="italic text-[#C5A059]">Presentes</span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#2D2D2D]/60 mt-1">
              Escolha um presente especial para encantar os noivos!
            </p>
          </div>

          <button
            onClick={() => setIsCustomGiftModalOpen(true)}
            className="px-4 py-2.5 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] font-bold text-[10px] uppercase tracking-widest rounded-sm transition flex items-center space-x-2 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <span>Sugerir Outro Presente</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-sm shadow-2xs border border-[#E5DFD5] space-y-4">
          {/* Search bar & status dropdown */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
              <input 
                type="text"
                placeholder="Buscar presente por nome ou palavra-chave..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-sm focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold border border-[#E5DFD5] rounded-sm focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
            >
              <option value="available">🟢 Disponíveis para Escolher</option>
              <option value="all">Ver Todos os Presentes</option>
              <option value="claimed">🔒 Já Reservados</option>
            </select>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('Todas')}
              className={`px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition ${
                selectedCategory === 'Todas'
                  ? 'bg-[#2D2D2D] text-white shadow-2xs'
                  : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              Todas ({gifts.length})
            </button>

            {CATEGORIES.map(cat => {
              const count = gifts.filter(g => g.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-[#2D2D2D] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Gifts Grid */}
        {filteredGifts.length === 0 ? (
          <div className="bg-white rounded-sm p-12 text-center border border-[#E5DFD5] space-y-3">
            <GiftIcon className="w-10 h-10 text-[#C5A059]/40 mx-auto" />
            <h3 className="font-serif italic text-[#2D2D2D] text-lg">Nenhum presente encontrado</h3>
            <p className="text-xs text-[#2D2D2D]/60 max-w-sm mx-auto">
              Tente alterar os filtros de busca ou categoria para encontrar os itens desejados.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todas');
                setStatusFilter('available');
                setSearchTerm('');
              }}
              className="text-xs font-semibold text-[#C5A059] hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGifts.map(gift => (
              <div 
                key={gift.id}
                className={`bg-white rounded-sm p-5 border transition flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md ${
                  gift.isClaimed 
                    ? 'border-[#E5DFD5] bg-[#FAF9F6] opacity-75' 
                    : 'border-[#E5DFD5] hover:border-[#C5A059]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                      {gift.category}
                    </span>

                    {gift.isClaimed ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#2D2D2D]/60 bg-[#F2ECE4] px-2 py-0.5 rounded-2xs">
                        🔒 Já Reservado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-2xs border border-emerald-200/60">
                        🟢 Disponível
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif italic text-[#2D2D2D] text-lg leading-snug">
                    {gift.name}
                  </h3>

                  {gift.description && (
                    <p className="text-xs text-[#2D2D2D]/70 leading-relaxed font-sans">
                      {gift.description}
                    </p>
                  )}

                  {gift.priceRange && (
                    <p className="text-xs text-[#C5A059] font-serif italic">
                      Valor est.: {gift.priceRange}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E5DFD5]">
                  {gift.isClaimed ? (
                    <div className="text-xs text-[#2D2D2D]/60 italic flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-sans">Reservado por:</span>
                      <span className="font-serif font-bold text-[#2D2D2D] not-italic">
                        {gift.claimedByGuestName || 'Convidado Especial'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedGiftToClaim(gift)}
                      className="w-full py-2.5 px-4 bg-[#2D2D2D] hover:bg-black text-white text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm shadow-2xs transition flex items-center justify-center space-x-2"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#C5A059] fill-current" />
                      <span>Presentear</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Claim Modal */}
      <ClaimGiftModal 
        gift={selectedGiftToClaim}
        onClose={() => setSelectedGiftToClaim(null)}
        onConfirm={onClaimGift}
      />

      {/* Custom Gift Modal */}
      <CustomGiftModal 
        isOpen={isCustomGiftModalOpen}
        onClose={() => setIsCustomGiftModalOpen(false)}
        onAdd={onAddCustomGift}
        isGuestView={true}
      />
    </div>
  );
};
