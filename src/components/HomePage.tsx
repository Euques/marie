import React, { useState, useMemo } from 'react';
import { EventInfo, Guest, GuestAuthSession } from '../types';
import { 
  Heart, Calendar, Clock, MapPin, Copy, Check, ExternalLink, 
  Sparkles, QrCode, MessageCircle, Send, Users, CheckCircle2, 
  Lock, Gift as GiftIcon, ArrowRight, ChevronDown, ChevronUp, User
} from 'lucide-react';

interface HomePageProps {
  eventInfo: EventInfo;
  guests: Guest[];
  guestSession: GuestAuthSession | null;
  onSubmitRsvp: (data: { name: string; email?: string; phone?: string; companions: number; status: 'confirmed' | 'declined'; message?: string }) => Promise<void>;
  onNavigate: (route: 'home' | 'presentes' | 'login' | 'noiva') => void;
  availableGiftsCount: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  eventInfo,
  guests,
  guestSession,
  onSubmitRsvp,
  onNavigate,
  availableGiftsCount
}) => {
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

  // Accordion States (Closed by default)
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  // Copy states
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Keep RSVP name/email updated with session
  React.useEffect(() => {
    if (guestSession) {
      if (guestSession.name) setRsvpName(guestSession.name);
      if (guestSession.email) setRsvpEmail(guestSession.email);
    }
  }, [guestSession]);

  // Default couple photo fallback
  const couplePhoto = eventInfo.coverImage || 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80';

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in px-2 sm:px-4">
      
      {/* 1. HERO CARD WITH PHOTO & TITLE (CARD DOS NOIVOS) */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-[#E5DFD5] overflow-hidden">
        
        {/* HERO IMAGE CONTAINER */}
        <div className="relative w-full h-80 sm:h-[420px] lg:h-[480px] bg-stone-900 group overflow-hidden">
          <img 
            src={couplePhoto} 
            alt={`${eventInfo.brideName} & ${eventInfo.groomName}`}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out opacity-90"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

          {/* Top Badges */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center space-x-2">
            <span className="px-3.5 py-1.5 bg-white/90 backdrop-blur-md text-[#C5A059] text-[10px] font-bold uppercase tracking-[0.25em] rounded-full border border-white/40 shadow-md flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Chá de Panela</span>
            </span>
            {daysLeft !== null && daysLeft >= 0 && (
              <span className="px-3.5 py-1.5 bg-[#2D2D2D]/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/20 shadow-md flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{daysLeft === 0 ? '🎉 É Hoje!' : `Faltam ${daysLeft} dias`}</span>
              </span>
            )}
          </div>

          {/* Bottom Hero Text Overlay */}
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 text-white space-y-1">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.3em] font-medium text-amber-200/90 font-sans">
              {eventInfo.eventTitle || 'Chá de Panela'}
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-md">
              {eventInfo.brideName} <span className="text-[#C5A059]">&</span> {eventInfo.groomName}
            </h1>
          </div>
        </div>

        {/* WELCOME MESSAGE */}
        {eventInfo.welcomeMessage && (
          <div className="p-6 sm:p-8 bg-[#FAF9F6] border-t border-[#E5DFD5]/80 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#F2ECE4] text-[#C5A059] flex items-center justify-center mx-auto border border-[#E5DFD5]">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <p className="text-[#2D2D2D] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed font-medium">
              "{eventInfo.welcomeMessage}"
            </p>
          </div>
        )}

      </div>

      {/* 2. CARD DE LISTA DE PRESENTES (EMBAIXO DO CARD DOS NOIVOS) */}
      <div className="bg-gradient-to-r from-[#2D2D2D] via-[#1E1E1E] to-[#2D2D2D] text-white p-6 sm:p-8 rounded-[2rem] shadow-xl border border-[#C5A059]/40 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all hover:border-[#C5A059]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C5A059] text-white flex items-center justify-center shrink-0 shadow-md">
            <GiftIcon className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C5A059] bg-[#C5A059]/20 px-2.5 py-0.5 rounded-full border border-[#C5A059]/30 mb-1 inline-block">
              Lista de Presentes
            </span>
            <h3 className="font-bold text-xl sm:text-2xl text-white leading-tight">
              Presentear os Noivos
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              {availableGiftsCount > 0 
                ? `${availableGiftsCount} ${availableGiftsCount === 1 ? 'presente disponível' : 'presentes disponíveis'} na lista`
                : 'Confira a lista completa de presentes do casal'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('presentes')}
          className="w-full sm:w-auto px-6 py-3.5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center space-x-2 shrink-0 shadow-md active:scale-95"
        >
          <span>Ver Lista de Presentes</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. ACCORDION: CONFIRMAÇÃO DE PRESENÇA (RSVP) */}
      <div id="confirmar-presenca" className="bg-white rounded-2xl shadow-xs border border-[#E5DFD5] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsRsvpOpen(!isRsvpOpen)}
          className="w-full p-4 sm:p-5 bg-[#FAF9F6] hover:bg-[#F2ECE4] flex items-center justify-between transition cursor-pointer text-left"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#2D2D2D] truncate">
                Confirmação de Presença
              </h2>
              <p className="text-[11px] text-[#2D2D2D]/60 font-sans truncate">
                {guestSession ? `Convidado: ${guestSession.name}` : 'Confirme sua presença ou aceite o convite'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hidden sm:inline">
              {isRsvpOpen ? 'Recolher' : 'Expandir'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
              {isRsvpOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {isRsvpOpen && (
          <div className="p-6 sm:p-8 space-y-6 bg-white">
            {!guestSession ? (
              /* GUEST NOT LOGGED IN */
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-[#2D2D2D]">
                    Você foi <span className="text-[#C5A059]">Convidado(a)!</span>
                  </h3>
                  <p className="text-xs text-[#2D2D2D]/70 max-w-md mx-auto leading-relaxed">
                    Clique no botão abaixo para aceitar o convite, identificar-se e confirmar sua presença no nosso Chá de Panela.
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('login')}
                  className="w-full sm:w-auto px-8 py-4 bg-[#2D2D2D] hover:bg-black text-white font-bold text-xs uppercase tracking-[0.2em] rounded-2xl shadow-md transition-all inline-flex items-center justify-center space-x-2.5 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Aceitar Convite / Entrar</span>
                </button>
              </div>
            ) : (
              /* GUEST LOGGED IN FORM */
              <div className="space-y-6">
                {rsvpSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-emerald-900">
                        Presença Confirmada com Sucesso! 🎉
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Obrigado, {guestSession.name}! Seus dados foram salvos com carinho pelos noivos.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setRsvpSubmitted(false)}
                        className="text-xs font-bold uppercase tracking-wider text-[#2D2D2D]/60 underline hover:text-[#2D2D2D]"
                      >
                        Editar dados da confirmação
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRsvpSubmit} className="space-y-4">
                    {rsvpError && (
                      <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-xl border border-rose-200 font-medium">
                        {rsvpError}
                      </div>
                    )}

                    {/* Status Radio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label 
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center space-x-3 ${
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
                        <span className="text-xs">Sim, com certeza estarei lá! 🎉</span>
                      </label>

                      <label 
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center space-x-3 ${
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                          WhatsApp / Telefone
                        </label>
                        <input 
                          type="tel"
                          placeholder="(11) 99999-9999"
                          value={rsvpPhone}
                          onChange={e => setRsvpPhone(e.target.value)}
                          className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                          Acompanhantes
                        </label>
                        <select
                          value={rsvpCompanions}
                          onChange={e => setRsvpCompanions(Number(e.target.value))}
                          className="w-full px-4 py-3 text-xs border border-[#E5DFD5] rounded-xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
                        >
                          <option value={0}>Apenas eu</option>
                          <option value={1}>+ 1 acompanhante</option>
                          <option value={2}>+ 2 acompanhantes</option>
                          <option value={3}>+ 3 acompanhantes</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                        Recado para os Noivos (Opcional)
                      </label>
                      <textarea 
                        rows={2}
                        placeholder="Deixe uma mensagem carinhosa..."
                        value={rsvpMessage}
                        onChange={e => setRsvpMessage(e.target.value)}
                        className="w-full px-4 py-3 text-xs border border-[#E5DFD5] bg-[#FAF9F6] rounded-xl focus:border-[#C5A059] outline-none transition resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={rsvpLoading}
                      className="w-full py-4 bg-[#2D2D2D] hover:bg-black active:scale-98 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-[#C5A059]" />
                      <span>{rsvpLoading ? 'Salvando...' : 'Confirmar Presença Agora'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. ACCORDION: CHAVE PIX */}
      {eventInfo.pixKey && (
        <div className="bg-white rounded-2xl shadow-xs border border-[#E5DFD5] overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsPixOpen(!isPixOpen)}
            className="w-full p-4 sm:p-5 bg-[#FAF9F6] hover:bg-[#F2ECE4] flex items-center justify-between transition cursor-pointer text-left"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-2xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#2D2D2D] truncate">
                  Presente em PIX
                </h2>
                <p className="text-[11px] text-[#2D2D2D]/60 font-sans truncate">
                  Contribua diretamente com os noivos via Chave PIX
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hidden sm:inline">
                {isPixOpen ? 'Recolher' : 'Expandir'}
              </span>
              <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
                {isPixOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </button>

          {isPixOpen && (
            <div className="p-6 sm:p-8 bg-white border-t border-[#E5DFD5]">
              <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#C5A059]/40 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 text-[#C5A059]">
                    <QrCode className="w-6 h-6" />
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60 block">Presente em PIX</span>
                      <span className="text-xs font-semibold text-[#2D2D2D]">Chave PIX dos Noivos</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyPix}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-[10px] uppercase tracking-widest font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                  </button>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E5DFD5] font-mono text-xs text-[#2D2D2D] break-all select-all">
                  {eventInfo.pixKey}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ACCORDION: MURAL DE RECADOS */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E5DFD5] overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsMessagesOpen(!isMessagesOpen)}
          className="w-full p-4 sm:p-5 bg-[#FAF9F6] hover:bg-[#F2ECE4] flex items-center justify-between transition cursor-pointer text-left"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-2xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#2D2D2D] truncate">
                Mural de Recados
              </h2>
              <p className="text-[11px] text-[#2D2D2D]/60 font-sans truncate">
                {guestMessages.length} {guestMessages.length === 1 ? 'mensagem enviada' : 'mensagens enviadas'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider hidden sm:inline">
              {isMessagesOpen ? 'Recolher' : 'Expandir'}
            </span>
            <div className="w-8 h-8 rounded-full bg-white border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
              {isMessagesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {isMessagesOpen && (
          <div className="p-6 sm:p-8 space-y-5 bg-white border-t border-[#E5DFD5]">
            {guestMessages.length === 0 ? (
              <div className="bg-[#FAF9F6] p-8 rounded-2xl border border-[#E5DFD5] text-center space-y-2">
                <MessageCircle className="w-8 h-8 text-[#C5A059]/40 mx-auto" />
                <p className="text-xs font-semibold text-[#2D2D2D]">Nenhum recado no mural ainda</p>
                <p className="text-[11px] text-[#2D2D2D]/60">
                  Aceite o convite e seja o primeiro a deixar uma mensagem carinhosa para o casal!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guestMessages.map((guest, idx) => (
                  <div key={idx} className="bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl border border-[#E5DFD5] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-[#2D2D2D]">
                      <span className="font-bold text-base text-[#C5A059]">{guest.name}</span>
                      <span className="text-[9px] text-[#2D2D2D]/50 uppercase tracking-widest font-sans bg-[#F2ECE4] px-2 py-0.5 rounded-full border border-[#E5DFD5]">
                        {guest.status === 'confirmed' ? 'Confirmado' : 'Recado'}
                      </span>
                    </div>
                    <p className="text-xs text-[#2D2D2D]/80 leading-relaxed">
                      "{guest.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. INFORMAÇÕES DO EVENTO (NO FINAL DA PÁGINA) */}
      <div className="bg-white rounded-[2rem] shadow-lg border border-[#E5DFD5] p-6 sm:p-8 space-y-5">
        <div className="flex items-center space-x-2 border-b border-[#E5DFD5] pb-3">
          <Sparkles className="w-5 h-5 text-[#C5A059]" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#2D2D2D]">
            Informações do Evento
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date & Time Card */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5DFD5] space-y-2.5">
            <div className="flex items-center space-x-2 text-[#C5A059]">
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60">Data e Horário</span>
            </div>
            <p className="text-base font-bold text-[#2D2D2D] capitalize">
              {formatDateString(eventInfo.date) || 'A definir'}
            </p>
            <p className="text-xs text-[#2D2D2D]/70 flex items-center space-x-1.5 font-sans">
              <Clock className="w-4 h-4 text-[#C5A059]" />
              <span>A partir das {eventInfo.time || '15:30'}h</span>
            </p>
          </div>

          {/* Location Card */}
          <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#E5DFD5] space-y-2.5">
            <div className="flex items-center space-x-2 text-[#C5A059]">
              <MapPin className="w-5 h-5" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#2D2D2D]/60">Localização</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#2D2D2D] leading-snug">
              {eventInfo.location || 'Espaço a confirmar'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {eventInfo.googleMapsUrl && (
                <a
                  href={eventInfo.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-[#2D2D2D] hover:bg-black text-white text-[10px] uppercase tracking-widest font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Abrir no Google Maps</span>
                </a>
              )}
              <button
                onClick={handleCopyAddress}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-white border border-[#E5DFD5] text-[#2D2D2D] text-[10px] uppercase tracking-widest font-bold rounded-xl hover:bg-[#F2ECE4] transition flex items-center justify-center space-x-1.5"
              >
                {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAddress ? 'Endereço Copiado' : 'Copiar Endereço'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
