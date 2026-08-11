import React, { useState, useMemo } from 'react';
import { EventInfo, Gift, GiftCategory, Guest } from '../types';
import { ClaimGiftModal } from './ClaimGiftModal';
import { CustomGiftModal } from './CustomGiftModal';
import { 
  Heart, Calendar, Clock, MapPin, Copy, Check, ExternalLink, 
  Gift as GiftIcon, Search, Filter, Sparkles, QrCode, MessageCircle, 
  Send, Users, CheckCircle2, User, ChevronDown, Phone, Mail, Lock, Unlock, LogIn, X, Crown
} from 'lucide-react';

interface GuestViewProps {
  eventInfo: EventInfo;
  gifts: Gift[];
  guests: Guest[];
  onClaimGift: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
  onAddCustomGift: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  onSubmitRsvp: (data: { name: string; email?: string; phone?: string; companions: number; status: 'confirmed' | 'declined'; message?: string }) => Promise<void>;
  onOpenAdmin?: () => void;
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
  onSubmitRsvp,
  onOpenAdmin
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'claimed'>('available');
  const [searchTerm, setSearchTerm] = useState('');

  // Active Page Tab for Authenticated Guests
  const [activeTab, setActiveTab] = useState<'evento' | 'presentes' | 'recados'>('evento');

  // Modals
  const [selectedGiftToClaim, setSelectedGiftToClaim] = useState<Gift | null>(null);
  const [isCustomGiftModalOpen, setIsCustomGiftModalOpen] = useState(false);

  // Guest Authentication Session State
  interface GuestAuthSession {
    name: string;
    email: string;
    provider: 'google' | 'email';
  }

  const [guestSession, setGuestSession] = useState<GuestAuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('cha_guest_session');
      if (saved) return JSON.parse(saved);
      const legacyName = localStorage.getItem('cha_guest_name');
      if (legacyName) {
        return { name: legacyName, email: '', provider: 'email' };
      }
    } catch {
      return null;
    }
    return null;
  });

  // Login Form States
  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  
  // Google Auth Modal Inputs
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleAuthError, setGoogleAuthError] = useState('');

  // Email Auth Inputs
  const [emailNameInput, setEmailNameInput] = useState('');
  const [emailEmailInput, setEmailEmailInput] = useState('');
  const [emailAuthError, setEmailAuthError] = useState('');

  // RSVP Form State
  const [rsvpName, setRsvpName] = useState(guestSession?.name || '');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState(guestSession?.email || '');
  const [rsvpCompanions, setRsvpCompanions] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  // Keep RSVP name and email synchronized with guestSession
  React.useEffect(() => {
    if (guestSession) {
      if (guestSession.name) setRsvpName(guestSession.name);
      if (guestSession.email) setRsvpEmail(guestSession.email);
    }
  }, [guestSession]);

  // Auth Action Handlers
  const handleLoginSuccess = (name: string, email: string, provider: 'google' | 'email') => {
    const session: GuestAuthSession = { name: name.trim(), email: email.trim(), provider };
    setGuestSession(session);
    setRsvpName(session.name);
    setRsvpEmail(session.email);
    try {
      localStorage.setItem('cha_guest_session', JSON.stringify(session));
      localStorage.setItem('cha_guest_name', session.name);
      localStorage.setItem('cha_guest_unlocked', 'true');
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoogleQuickLogin = (name: string, email: string) => {
    handleLoginSuccess(name, email, 'google');
    setIsGoogleModalOpen(false);
    setTimeout(() => scrollToRsvp(), 300);
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleCustomName.trim()) {
      setGoogleAuthError('Por favor, informe seu nome.');
      return;
    }
    const cleanEmail = googleCustomEmail.trim() || `${googleCustomName.trim().toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
    handleLoginSuccess(googleCustomName.trim(), cleanEmail, 'google');
    setIsGoogleModalOpen(false);
    setTimeout(() => scrollToRsvp(), 300);
  };

  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailNameInput.trim()) {
      setEmailAuthError('Por favor, informe seu nome completo.');
      return;
    }
    if (!emailEmailInput.trim()) {
      setEmailAuthError('Por favor, informe seu e-mail.');
      return;
    }
    handleLoginSuccess(emailNameInput.trim(), emailEmailInput.trim(), 'email');
    setEmailAuthError('');
    setTimeout(() => scrollToRsvp(), 300);
  };

  const handleLogoutGuest = () => {
    setGuestSession(null);
    setRsvpSubmitted(false);
    try {
      localStorage.removeItem('cha_guest_session');
      localStorage.removeItem('cha_guest_name');
      localStorage.removeItem('cha_guest_unlocked');
    } catch (err) {
      console.error(err);
    }
  };

  // Copy states
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Default couple photo fallback
  const couplePhoto = eventInfo.coverImage || 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80';

  // Countdown calculations
  const daysLeft = useMemo(() => {
    if (!eventInfo.date) return null;
    const eventDate = new Date(eventInfo.date + 'T' + (eventInfo.time || '12:00'));
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [eventInfo.date, eventInfo.time]);

  // Messages left by guests
  const guestMessages = useMemo(() => {
    return guests.filter(g => g.message && g.message.trim().length > 0);
  }, [guests]);

  // Filtered Gifts
  const filteredGifts = useMemo(() => {
    return gifts.filter(gift => {
      if (selectedCategory !== 'Todas' && gift.category !== selectedCategory) {
        return false;
      }
      if (statusFilter === 'available' && gift.isClaimed) {
        return false;
      }
      if (statusFilter === 'claimed' && !gift.isClaimed) {
        return false;
      }
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

  const availableCount = gifts.filter(g => !g.isClaimed).length;

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
      
      const guestNameClean = rsvpName.trim();
      setRsvpSubmitted(true);
      if (!guestSession) {
        handleLoginSuccess(guestNameClean, rsvpEmail.trim(), 'email');
      }

      setTimeout(() => {
        scrollToGifts();
      }, 400);

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

  const scrollToRsvp = () => {
    setActiveTab('evento');
    setTimeout(() => {
      const el = document.getElementById('confirmar-presenca');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToGifts = () => {
    setActiveTab('presentes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Modern App Container Card */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-[#E5DFD5] overflow-hidden">
        
        {/* APP HERO HEADER (Foto do Casal, Chá de Panela, Nomes, Botão Confirmar Presença) */}
        <div className="relative bg-gradient-to-b from-[#F2ECE4] via-[#FAF9F6] to-white p-6 sm:p-10 text-center space-y-5 border-b border-[#E5DFD5]/60">
          
          {/* Subtle background ornamentation */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Badge: Chá de Panela */}
          <div className="relative inline-flex items-center space-x-2 px-4 py-1.5 bg-white text-[#C5A059] text-[10px] font-bold uppercase tracking-[0.25em] border border-[#E5DFD5] rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Chá de Panela</span>
          </div>

          {/* Foto do Casal */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-full p-1.5 bg-gradient-to-tr from-[#C5A059] via-amber-200 to-[#C5A059] shadow-xl">
            <img 
              src={couplePhoto} 
              alt={`${eventInfo.brideName} & ${eventInfo.groomName}`}
              className="w-full h-full object-cover rounded-full border-2 border-white shadow-inner"
            />
          </div>

          {/* Nomes do Casal */}
          <div className="space-y-1 relative">
            <h1 className="text-3xl sm:text-4xl text-[#2D2D2D] font-extrabold tracking-tight">
              {eventInfo.brideName} <span className="text-[#C5A059]">&</span> {eventInfo.groomName}
            </h1>
            <p className="text-xs text-[#2D2D2D]/60 uppercase tracking-widest font-sans font-medium">
              {eventInfo.eventTitle || 'Chá de Panela da Mari'}
            </p>
          </div>

          {/* Welcome quote */}
          {eventInfo.welcomeMessage && (
            <p className="text-[#2D2D2D]/80 max-w-md mx-auto text-xs sm:text-sm leading-relaxed font-sans bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-[#E5DFD5] shadow-xs italic">
              "{eventInfo.welcomeMessage}"
            </p>
          )}

          {daysLeft !== null && daysLeft >= 0 && (
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#F2ECE4] rounded-full text-[10px] font-bold text-[#C5A059] uppercase tracking-wider border border-[#E5DFD5]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{daysLeft === 0 ? '🎉 É hoje o grande dia!' : `Faltam ${daysLeft} dias para o Chá!`}</span>
            </div>
          )}
        </div>

        {/* APP BODY FEED */}
        <div className="p-5 sm:p-8 space-y-6">

          {/* PAGE NAVIGATION TABS */}
          <div className="flex items-center justify-center p-1.5 bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl gap-1 shadow-2xs">
            <button
              onClick={() => setActiveTab('evento')}
              className={`flex-1 py-3 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'evento'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D]/70 hover:bg-[#F2ECE4]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>O Evento & Presença</span>
            </button>

            <button
              onClick={() => setActiveTab('presentes')}
              className={`flex-1 py-3 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'presentes'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D]/70 hover:bg-[#F2ECE4]'
              }`}
            >
              <GiftIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Lista de Presentes</span>
              {availableCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === 'presentes' ? 'bg-[#C5A059] text-white' : 'bg-[#E5DFD5] text-[#2D2D2D]'
                }`}>
                  {availableCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('recados')}
              className={`flex-1 py-3 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'recados'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'text-[#2D2D2D]/70 hover:bg-[#F2ECE4]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="hidden sm:inline">Mural de Recados</span>
              <span className="sm:hidden">Recados</span>
              {guestMessages.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === 'recados' ? 'bg-[#C5A059] text-white' : 'bg-[#E5DFD5] text-[#2D2D2D]'
                }`}>
                  {guestMessages.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: O EVENTO & CONFIRMAÇÃO DE PRESENÇA */}
          {activeTab === 'evento' && (
            <div className="space-y-6 animate-fade-in">
              {/* SECTION 1: Detalhes do Evento (Data e Local) */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-[#E5DFD5] pb-2">
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <h2 className="text-xl font-bold text-[#2D2D2D]">Informações do Encontro</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date & Time */}
                  <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5DFD5] space-y-2">
                    <div className="flex items-center space-x-2 text-[#C5A059]">
                      <Calendar className="w-5 h-5" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60">Data e Hora</span>
                    </div>
                    <p className="text-sm font-bold text-[#2D2D2D] capitalize">
                      {formatDateString(eventInfo.date) || 'A definir'}
                    </p>
                    <p className="text-xs text-[#2D2D2D]/70 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{eventInfo.time || '15:30'}h</span>
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5DFD5] space-y-2">
                    <div className="flex items-center space-x-2 text-[#C5A059]">
                      <MapPin className="w-5 h-5" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60">Localização</span>
                    </div>
                    <p className="text-xs font-semibold text-[#2D2D2D] leading-snug">
                      {eventInfo.location || 'Espaço a confirmar'}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      {eventInfo.googleMapsUrl && (
                        <a
                          href={eventInfo.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#2D2D2D] hover:bg-black text-white text-[9px] uppercase tracking-widest font-bold rounded-xl transition flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3 text-[#C5A059]" />
                          <span>Abrir no Maps</span>
                        </a>
                      )}
                      <button
                        onClick={handleCopyAddress}
                        className="px-3 py-1.5 bg-white border border-[#E5DFD5] text-[#2D2D2D] text-[9px] uppercase tracking-widest font-bold rounded-xl hover:bg-[#F2ECE4] transition flex items-center space-x-1"
                      >
                        {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAddress ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Identificação do Convidado e Confirmação de Presença (RSVP) */}
              <div id="confirmar-presenca" className="bg-[#FAF9F6] p-6 sm:p-8 rounded-3xl border border-[#E5DFD5] space-y-6">
                {!guestSession ? (
                  /* GUEST NOT LOGGED IN - LOGIN GATE */
                  <div className="space-y-6">
                    <div className="text-center space-y-1.5">
                      <div className="w-12 h-12 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-extrabold text-[#2D2D2D]">
                        Identificação do <span className="text-[#C5A059]">Convidado</span>
                      </h2>
                      <p className="text-xs text-[#2D2D2D]/70 max-w-md mx-auto leading-relaxed">
                        Acesse com sua conta do <strong>Google</strong> ou <strong>E-mail</strong> para liberar o formulário de confirmação de presença, a chave PIX e a lista de presentes!
                      </p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5DFD5] space-y-5 shadow-2xs max-w-md mx-auto">
                      {/* Tab Selector */}
                      <div className="flex bg-[#FAF9F6] p-1 rounded-xl border border-[#E5DFD5]">
                        <button
                          type="button"
                          onClick={() => setAuthTab('google')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-2 ${
                            authTab === 'google'
                              ? 'bg-white text-[#2D2D2D] shadow-2xs border border-[#E5DFD5]'
                              : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                          }`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                          </svg>
                          <span>Conta Google</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAuthTab('email')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-2 ${
                            authTab === 'email'
                              ? 'bg-white text-[#2D2D2D] shadow-2xs border border-[#E5DFD5]'
                              : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                          }`}
                        >
                          <Mail className="w-4 h-4 text-[#C5A059]" />
                          <span>E-mail</span>
                        </button>
                      </div>

                      {/* TAB 1: GOOGLE AUTH */}
                      {authTab === 'google' && (
                        <div className="space-y-3 text-center">
                          <p className="text-xs text-[#2D2D2D]/70">
                            Clique abaixo para se conectar instantaneamente usando sua conta do Google:
                          </p>

                          <button
                            type="button"
                            onClick={() => setIsGoogleModalOpen(true)}
                            className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 active:scale-98 text-[#2D2D2D] font-bold text-xs rounded-2xl border-2 border-[#E5DFD5] hover:border-[#C5A059] transition flex items-center justify-center space-x-3 shadow-xs"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                            <span>Entrar com o Google</span>
                          </button>

                          <div className="pt-2 text-[10px] text-[#2D2D2D]/50 uppercase tracking-widest font-semibold">
                            🔒 Autenticação rápida e segura
                          </div>
                        </div>
                      )}

                      {/* TAB 2: EMAIL AUTH */}
                      {authTab === 'email' && (
                        <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                          {emailAuthError && (
                            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                              {emailAuthError}
                            </div>
                          )}

                          <div>
                            <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                              Seu Nome Completo <span className="text-[#C5A059]">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Ana Maria Silva"
                              value={emailNameInput}
                              onChange={e => setEmailNameInput(e.target.value)}
                              className="w-full px-4 py-2.5 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.15em] mb-1">
                              Seu E-mail <span className="text-[#C5A059]">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="Ex: ana.silva@email.com"
                              value={emailEmailInput}
                              onChange={e => setEmailEmailInput(e.target.value)}
                              className="w-full px-4 py-2.5 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-xs transition active:scale-98 flex items-center justify-center space-x-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>Entrar e Liberar Formulário</span>
                          </button>
                        </form>
                      )}

                      {/* SEPARATION TO BRIDE PANEL */}
                      {onOpenAdmin && (
                        <div className="pt-4 border-t border-[#E5DFD5] text-center space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]/60">
                            Você é a Noiva ou o Noivo?
                          </p>
                          <button
                            type="button"
                            onClick={onOpenAdmin}
                            className="w-full py-3 px-4 bg-[#F2ECE4] hover:bg-[#E5DFD5] text-[#2D2D2D] font-bold text-xs uppercase tracking-wider rounded-xl border border-[#C5A059]/50 transition flex items-center justify-center space-x-2 shadow-2xs active:scale-98"
                          >
                            <Crown className="w-4 h-4 text-[#C5A059]" />
                            <span>Acessar Painel da Noiva / Noivo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Locked Banner Notification */}
                    <div className="bg-[#F2ECE4]/60 border border-[#E5DFD5] rounded-2xl p-4 text-center text-xs text-[#2D2D2D]/70 space-y-1">
                      <p className="font-semibold text-[#2D2D2D] flex items-center justify-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Acesso Protegido para Convidados</span>
                      </p>
                      <p className="text-[11px]">
                        O formulário de confirmação, a chave PIX e a lista de presentes serão exibidos imediatamente após você se identificar.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* GUEST IS LOGGED IN - SHOW RSVP FORM, PIX KEY & UNLOCKED EXPERIENCE */
                  <div className="space-y-6">
                    {/* Session Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-[#C5A059]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center space-x-3 text-left">
                        <div className="w-10 h-10 rounded-full bg-[#F2ECE4] border border-[#C5A059]/50 flex items-center justify-center text-[#C5A059] font-bold text-sm shrink-0">
                          {guestSession.provider === 'google' ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[#C5A059] bg-[#F2ECE4] px-2 py-0.5 rounded-full border border-[#E5DFD5]">
                              Conectado via {guestSession.provider === 'google' ? 'Google' : 'E-mail'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#2D2D2D] leading-tight mt-0.5">
                            {guestSession.name}
                          </p>
                          {guestSession.email && (
                            <p className="text-[10px] text-[#2D2D2D]/60 font-mono">
                              {guestSession.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleLogoutGuest}
                        className="px-3 py-1.5 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D]/70 text-[9px] font-bold uppercase tracking-wider rounded-xl border border-[#E5DFD5] transition shrink-0"
                      >
                        Sair / Trocar Conta
                      </button>
                    </div>

                    {/* RSVP Form Section */}
                    <div className="bg-white p-6 rounded-2xl border border-[#E5DFD5] space-y-5 shadow-2xs">
                      <div className="text-center space-y-1">
                        <div className="w-10 h-10 bg-[#F2ECE4] text-[#C5A059] rounded-xl flex items-center justify-center mx-auto">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-[#2D2D2D]">
                          Formulário de Confirmação de Presença
                        </h3>
                        <p className="text-xs text-[#2D2D2D]/60 font-sans">
                          Preencha abaixo para confirmar sua presença no nosso Chá de Panela!
                        </p>
                      </div>

                      {rsvpSubmitted ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <div>
                            <h4 className="text-lg font-bold text-emerald-900">
                              Presença Confirmada com Sucesso! 🎉
                            </h4>
                            <p className="text-xs text-emerald-800 mt-1">
                              Obrigado, {guestSession.name}! Os noivos mal podem esperar para celebrar com você.
                            </p>
                          </div>
                          <button
                            onClick={() => setRsvpSubmitted(false)}
                            className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] underline hover:text-[#2D2D2D]"
                          >
                            Editar dados da minha confirmação
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleRsvpSubmit} className="space-y-4">
                          {rsvpError && (
                            <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-medium">
                              {rsvpError}
                            </div>
                          )}

                          {/* Status Radio */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label 
                              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center space-x-3 ${
                                rsvpStatus === 'confirmed' 
                                  ? 'border-[#C5A059] bg-[#F2ECE4] text-[#2D2D2D] font-bold shadow-xs' 
                                  : 'border-[#E5DFD5] bg-[#FAF9F6] hover:border-[#C5A059]/50'
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
                              <span className="text-xs">Sim, estarei lá! 🎉</span>
                            </label>

                            <label 
                              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center space-x-3 ${
                                rsvpStatus === 'declined' 
                                  ? 'border-[#2D2D2D]/40 bg-white text-[#2D2D2D] font-bold shadow-xs' 
                                  : 'border-[#E5DFD5] bg-[#FAF9F6] hover:border-[#2D2D2D]/30'
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
                              <span className="text-xs">Infelizmente não poderei ir 💔</span>
                            </label>
                          </div>

                          {/* Inputs */}
                          <div>
                            <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                              Seu Nome Completo <span className="text-[#C5A059]">*</span>
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="Ex: Beatriz Lima"
                              value={rsvpName}
                              onChange={e => setRsvpName(e.target.value)}
                              className="w-full px-4 py-3 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                                WhatsApp / Celular
                              </label>
                              <input 
                                type="tel"
                                placeholder="(11) 99999-9999"
                                value={rsvpPhone}
                                onChange={e => setRsvpPhone(e.target.value)}
                                className="w-full px-4 py-3 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                                Acompanhantes
                              </label>
                              <select
                                value={rsvpCompanions}
                                onChange={e => setRsvpCompanions(Number(e.target.value))}
                                className="w-full px-4 py-3 text-sm border border-[#E5DFD5] rounded-2xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
                              >
                                <option value={0}>Apenas eu</option>
                                <option value={1}>+ 1 acompanhante</option>
                                <option value={2}>+ 2 acompanhantes</option>
                                <option value={3}>+ 3 acompanhantes</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                              Mensagem aos Noivos (Opcional)
                            </label>
                            <textarea 
                              rows={2}
                              placeholder="Deixe um carinho especial..."
                              value={rsvpMessage}
                              onChange={e => setRsvpMessage(e.target.value)}
                              className="w-full px-4 py-3 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={rsvpLoading}
                            className="w-full py-3.5 bg-[#2D2D2D] hover:bg-black active:scale-98 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4 text-[#C5A059]" />
                            <span>{rsvpLoading ? 'Enviando...' : 'Confirmar Presença'}</span>
                          </button>
                        </form>
                      )}
                    </div>

                    {/* PIX Option (UNLOCKED AFTER LOGGING IN) */}
                    {eventInfo.pixKey && (
                      <div className="bg-white p-5 rounded-2xl border border-[#C5A059]/40 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-[#C5A059]">
                            <QrCode className="w-5 h-5" />
                            <div>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60 block">Presente em PIX</span>
                              <span className="text-xs font-semibold text-[#2D2D2D]">Mimo em dinheiro para os noivos</span>
                            </div>
                          </div>
                          <button
                            onClick={handleCopyPix}
                            className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-white text-[10px] uppercase tracking-widest font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                          >
                            {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                          </button>
                        </div>
                        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E5DFD5] font-mono text-xs text-[#2D2D2D] break-all">
                          {eventInfo.pixKey}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CALLOUT BANNER TO DEDICATED GIFT LIST PAGE */}
              <div className="bg-gradient-to-r from-[#FAF9F6] to-[#F2ECE4] p-5 rounded-2xl border border-[#E5DFD5] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0">
                    <GiftIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2D2D2D] text-sm">
                      Deseja presentear os noivos?
                    </h4>
                    <p className="text-xs text-[#2D2D2D]/70">
                      Acesse a página dedicada da Lista de Presentes ({availableCount} disponíveis)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('presentes')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#2D2D2D] hover:bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <span>Ver Lista Completa</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DEDICATED LISTA DE PRESENTES PAGE */}
          {activeTab === 'presentes' && (
            <div className="space-y-6 animate-fade-in">
              {!guestSession ? (
                /* LOCKED GIFT LIST STATE */
                <div id="lista-presentes" className="bg-[#FAF9F6] border-2 border-dashed border-[#E5DFD5] rounded-3xl p-6 sm:p-10 text-center space-y-4">
                  <div className="w-14 h-14 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h2 className="text-2xl font-bold text-[#2D2D2D]">
                      Lista de Presentes Protegida
                    </h2>
                    <p className="text-xs text-[#2D2D2D]/70 font-sans leading-relaxed">
                      Para escolher e reservar um presente para os noivos, faça seu <strong>login com Google ou E-mail</strong> na aba Evento.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={scrollToRsvp}
                      className="px-6 py-3.5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-bold uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all inline-flex items-center space-x-2 active:scale-95"
                    >
                      <Unlock className="w-4 h-4 text-[#C5A059]" />
                      <span>Ir para o Login de Convidados</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* UNLOCKED DEDICATED GIFT LIST PAGE */
                <div id="lista-presentes" className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-3">
                    <div className="flex items-center space-x-2">
                      <GiftIcon className="w-6 h-6 text-[#C5A059]" />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#2D2D2D]">
                          Página de <span className="text-[#C5A059]">Presentes</span>
                        </h2>
                        <p className="text-xs text-[#2D2D2D]/60">
                          Escolha um presente para abençoar a nova fase dos noivos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCustomGiftModalOpen(true)}
                      className="px-3.5 py-2 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] font-bold text-[9px] uppercase tracking-widest rounded-xl transition flex items-center space-x-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Sugerir Presente</span>
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
                        <input 
                          type="text"
                          placeholder="Buscar presente por nome..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 text-xs font-semibold border border-[#E5DFD5] rounded-xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
                      >
                        <option value="available">🟢 Disponíveis</option>
                        <option value="all">Ver Todos</option>
                        <option value="claimed">🔒 Já Reservados</option>
                      </select>
                    </div>

                    {/* Category Pills */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        onClick={() => setSelectedCategory('Todas')}
                        className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-full whitespace-nowrap transition ${
                          selectedCategory === 'Todas'
                            ? 'bg-[#2D2D2D] text-white'
                            : 'bg-[#FAF9F6] text-[#2D2D2D]/70 border border-[#E5DFD5]'
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
                            className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-bold rounded-full whitespace-nowrap transition ${
                              selectedCategory === cat
                                ? 'bg-[#2D2D2D] text-white'
                                : 'bg-[#FAF9F6] text-[#2D2D2D]/70 border border-[#E5DFD5]'
                            }`}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gift Items Grid */}
                  {filteredGifts.length === 0 ? (
                    <div className="bg-[#FAF9F6] rounded-2xl p-8 text-center border border-[#E5DFD5] space-y-2">
                      <GiftIcon className="w-8 h-8 text-[#C5A059]/40 mx-auto" />
                      <p className="text-xs font-semibold text-[#2D2D2D]">Nenhum presente encontrado nesta categoria</p>
                      <button
                        onClick={() => { setSelectedCategory('Todas'); setStatusFilter('available'); setSearchTerm(''); }}
                        className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider underline"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {filteredGifts.map(gift => (
                        <div 
                          key={gift.id}
                          className={`bg-white rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 shadow-2xs ${
                            gift.isClaimed 
                              ? 'border-[#E5DFD5] bg-[#FAF9F6]/60 opacity-75' 
                              : 'border-[#E5DFD5] hover:border-[#C5A059]'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#C5A059] bg-[#F2ECE4] px-2 py-0.5 rounded-full border border-[#E5DFD5]">
                                {gift.category}
                              </span>
                              {gift.isClaimed ? (
                                <span className="text-[9px] font-bold text-[#2D2D2D]/50 bg-[#F2ECE4] px-2 py-0.5 rounded-full">
                                  🔒 Reservado
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  🟢 Disponível
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-[#2D2D2D] text-base leading-snug">
                              {gift.name}
                            </h3>

                            {gift.description && (
                              <p className="text-xs text-[#2D2D2D]/70 font-sans leading-relaxed">
                                {gift.description}
                              </p>
                            )}

                            {gift.priceRange && (
                              <p className="text-xs text-[#C5A059] font-semibold">
                                Valor est.: {gift.priceRange}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#E5DFD5]">
                            {gift.isClaimed ? (
                              <div className="text-[11px] text-[#2D2D2D]/60 italic flex items-center justify-between">
                                <span>Reservado por:</span>
                                <span className="font-bold text-[#2D2D2D] not-italic">
                                  {gift.claimedByGuestName || 'Convidado'}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedGiftToClaim(gift)}
                                className="w-full py-2.5 px-3 bg-[#2D2D2D] hover:bg-black active:scale-98 text-white text-[10px] uppercase tracking-[0.15em] font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
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
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEDICATED MURAL DE RECADOS PAGE */}
          {activeTab === 'recados' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2 border-b border-[#E5DFD5] pb-2">
                <MessageCircle className="w-5 h-5 text-[#C5A059]" />
                <h2 className="text-xl font-bold text-[#2D2D2D]">Mural de Carinho dos Convidados</h2>
              </div>

              {guestMessages.length === 0 ? (
                <div className="bg-[#FAF9F6] p-8 rounded-2xl border border-[#E5DFD5] text-center space-y-2">
                  <MessageCircle className="w-8 h-8 text-[#C5A059]/40 mx-auto" />
                  <p className="text-xs font-semibold text-[#2D2D2D]">Nenhum recado deixado ainda</p>
                  <p className="text-[11px] text-[#2D2D2D]/60">
                    Seja o primeiro a deixar uma mensagem de carinho ao confirmar sua presença na aba <strong>O Evento</strong>!
                  </p>
                  <button
                    onClick={() => setActiveTab('evento')}
                    className="mt-2 px-4 py-2 bg-[#2D2D2D] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition inline-block"
                  >
                    Confirmar Presença e Deixar Recado
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {guestMessages.map((guest, idx) => (
                    <div key={idx} className="bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl border border-[#E5DFD5] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2D2D2D]">
                        <span className="font-bold text-[#C5A059]">{guest.name}</span>
                        <span className="text-[9px] text-[#2D2D2D]/50 uppercase tracking-widest font-sans bg-[#F2ECE4] px-2 py-0.5 rounded-full border border-[#E5DFD5]">
                          {guest.status === 'confirmed' ? 'Confirmou presença' : 'Enviou recado'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#2D2D2D]/80 italic leading-relaxed">
                        "{guest.message}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOOTER: SEPARATED BRIDE / ADMIN ACCESS */}
          {onOpenAdmin && (
            <div className="pt-6 border-t border-[#E5DFD5] text-center space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]/50">
                Área Exclusiva do Casal
              </p>
              <button
                onClick={onOpenAdmin}
                className="px-5 py-2.5 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-2xl border border-[#E5DFD5] transition inline-flex items-center space-x-2 shadow-2xs"
              >
                <Crown className="w-4 h-4 text-[#C5A059]" />
                <span>Painel da Noiva / Noivo (Admin)</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Claim Modal */}
      <ClaimGiftModal 
        gift={selectedGiftToClaim}
        defaultGuestName={guestSession?.name || ''}
        defaultGuestEmail={guestSession?.email || ''}
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

      {/* Google Quick Sign-In Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 border border-[#E5DFD5] shadow-2xl relative">
            <button
              onClick={() => setIsGoogleModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 bg-white rounded-full border border-gray-200 flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Fazer login com o Google
              </h3>
              <p className="text-xs text-gray-500">
                Escolha uma das contas ou digite seus dados para continuar no site do Chá de Panela
              </p>
            </div>

            {/* Quick account pickers */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Contas sugeridas do Google:
              </p>
              
              <button
                type="button"
                onClick={() => handleGoogleQuickLogin('Maria Silva', 'maria.silva@gmail.com')}
                className="w-full p-3 rounded-2xl border border-gray-200 hover:border-[#C5A059] bg-gray-50 hover:bg-white text-left transition flex items-center space-x-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate group-hover:text-[#C5A059]">Maria Silva</p>
                  <p className="text-[10px] text-gray-500 truncate">maria.silva@gmail.com</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleQuickLogin('Carlos Eduardo', 'carlos.eduardo@gmail.com')}
                className="w-full p-3 rounded-2xl border border-gray-200 hover:border-[#C5A059] bg-gray-50 hover:bg-white text-left transition flex items-center space-x-3 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                  C
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate group-hover:text-[#C5A059]">Carlos Eduardo</p>
                  <p className="text-[10px] text-gray-500 truncate">carlos.eduardo@gmail.com</p>
                </div>
              </button>
            </div>

            {/* Custom Google account entry */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Ou digite os dados da sua conta Google:
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Seu Nome no Google"
                  value={googleCustomName}
                  onChange={e => setGoogleCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-[#C5A059] outline-none"
                />
                <input
                  type="email"
                  placeholder="Seu E-mail do Gmail"
                  value={googleCustomEmail}
                  onChange={e => setGoogleCustomEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:border-[#C5A059] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (googleCustomName.trim()) {
                      handleGoogleQuickLogin(
                        googleCustomName.trim(), 
                        googleCustomEmail.trim() || `${googleCustomName.trim().toLowerCase().replace(/\s+/g, '.')}@gmail.com`
                      );
                    }
                  }}
                  className="w-full py-2.5 bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-2xs"
                >
                  Continuar com esta conta
                </button>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="text-[11px] text-gray-400 hover:text-gray-600 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
