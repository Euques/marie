import React, { useState, useMemo } from 'react';
import { EventInfo, Gift, GiftCategory, Guest } from '../types';
import { GuestModal } from './GuestModal';
import { GiftModal } from './GiftModal';
import { 
  Crown, Users, Gift as GiftIcon, CheckCircle2, Clock, XCircle, 
  Plus, Edit, Trash2, Lock, Unlock, Settings, Share2, Printer, 
  RefreshCw, Search, Filter, Copy, Check, MessageSquare, Phone, 
  Sparkles, AlertCircle, Heart, ArrowRight
} from 'lucide-react';

interface AdminPanelProps {
  eventInfo: EventInfo;
  gifts: Gift[];
  guests: Guest[];
  onUpdateEventInfo: (info: Partial<EventInfo>) => Promise<void>;
  onSaveGuest: (guestData: Omit<Guest, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteGuest: (id: string) => Promise<void>;
  onSaveGift: (giftData: Omit<Gift, 'id'> & { id?: string }) => Promise<void>;
  onDeleteGift: (id: string) => Promise<void>;
  onUnclaimGift: (id: string) => Promise<void>;
  onResetData: () => Promise<void>;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  eventInfo,
  gifts,
  guests,
  onUpdateEventInfo,
  onSaveGuest,
  onDeleteGuest,
  onSaveGift,
  onDeleteGift,
  onUnclaimGift,
  onResetData
}) => {
  // Password auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guests' | 'gifts' | 'settings' | 'invite'>('dashboard');

  // Modals state
  const [selectedGuestForEdit, setSelectedGuestForEdit] = useState<Guest | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  const [selectedGiftForEdit, setSelectedGiftForEdit] = useState<Gift | null>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  // Filters
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');

  const [giftSearch, setGiftSearch] = useState('');
  const [giftCategoryFilter, setGiftCategoryFilter] = useState<string>('Todas');
  const [giftStatusFilter, setGiftStatusFilter] = useState<'all' | 'claimed' | 'available'>('all');

  // Event form state
  const [eventForm, setEventForm] = useState<EventInfo>(eventInfo);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Copy WhatsApp link state
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);

  // Authenticate handler
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === eventInfo.adminPassword || passwordInput === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Senha incorreta! A senha padrão é 1234.');
    }
  };

  // Metrics
  const confirmedGuests = useMemo(() => guests.filter(g => g.status === 'confirmed'), [guests]);
  const pendingGuests = useMemo(() => guests.filter(g => g.status === 'pending'), [guests]);
  const declinedGuests = useMemo(() => guests.filter(g => g.status === 'declined'), [guests]);

  const totalCompanionsConfirmed = useMemo(() => {
    return confirmedGuests.reduce((sum, g) => sum + (g.companions || 0), 0);
  }, [confirmedGuests]);

  const totalConfirmedPeople = confirmedGuests.length + totalCompanionsConfirmed;

  const claimedGifts = useMemo(() => gifts.filter(g => g.isClaimed), [gifts]);
  const availableGifts = useMemo(() => gifts.filter(g => !g.isClaimed), [gifts]);
  const claimedPercent = gifts.length > 0 ? Math.round((claimedGifts.length / gifts.length) * 100) : 0;

  // Filtered Guests list
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      if (guestStatusFilter !== 'all' && g.status !== guestStatusFilter) return false;
      if (guestSearch.trim()) {
        const term = guestSearch.toLowerCase();
        const matchName = g.name.toLowerCase().includes(term);
        const matchPhone = g.phone?.toLowerCase().includes(term);
        const matchEmail = g.email?.toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [guests, guestStatusFilter, guestSearch]);

  // Filtered Gifts list
  const filteredGifts = useMemo(() => {
    return gifts.filter(g => {
      if (giftCategoryFilter !== 'Todas' && g.category !== giftCategoryFilter) return false;
      if (giftStatusFilter === 'claimed' && !g.isClaimed) return false;
      if (giftStatusFilter === 'available' && g.isClaimed) return false;
      if (giftSearch.trim()) {
        const term = giftSearch.toLowerCase();
        const matchName = g.name.toLowerCase().includes(term);
        const matchGuest = g.claimedByGuestName?.toLowerCase().includes(term);
        if (!matchName && !matchGuest) return false;
      }
      return true;
    });
  }, [gifts, giftCategoryFilter, giftStatusFilter, giftSearch]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsLoading(true);
      await onUpdateEventInfo(eventForm);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao salvar configurações.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const getWhatsAppMessage = (guestName?: string) => {
    const link = window.location.origin;
    const nameStr = guestName ? `Olá, ${guestName}! ` : '';
    return `*Convite Especial de Chá de Panela* 🎉\n\n${nameStr}Você está convidado(a) para o *${eventInfo.eventTitle}* de *${eventInfo.brideName} & ${eventInfo.groomName}*!\n\n📅 *Data:* ${eventInfo.date}\n⏰ *Horário:* ${eventInfo.time}h\n📍 *Local:* ${eventInfo.location}\n\nAcesse nosso site para confirmar sua presença e escolher um presente da lista:\n👉 ${link}`;
  };

  const handleCopyWhatsAppInvite = (guestName?: string) => {
    const msg = getWhatsAppMessage(guestName);
    navigator.clipboard.writeText(msg);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  // Lock Password Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-md max-w-md w-full p-8 border border-[#E5DFD5] space-y-6 text-center">
          <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xs flex items-center justify-center mx-auto shadow-2xs">
            <Crown className="w-8 h-8 text-[#C5A059]" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif italic text-2xl font-bold text-[#2D2D2D]">Painel da Noiva</h2>
            <p className="text-xs text-[#2D2D2D]/60 font-sans">Digite a senha para gerenciar o chá de panela</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {authError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-sm border border-rose-200">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-[#2D2D2D]/70 uppercase tracking-[0.2em] mb-1">
                Senha de Acesso
              </label>
              <input 
                type="password"
                required
                placeholder="Senha (padrão: 1234)"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-sm focus:border-[#C5A059] outline-none transition"
              />
              <p className="text-[11px] text-[#2D2D2D]/50 mt-1">Dica: A senha padrão para teste é <span className="font-mono font-bold text-[#C5A059]">1234</span></p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm shadow-2xs transition flex items-center justify-center space-x-2"
            >
              <Unlock className="w-4 h-4 text-[#C5A059]" />
              <span>Acessar Painel</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Admin Status Banner */}
      <div className="no-print bg-[#2D2D2D] text-white p-4 sm:p-5 rounded-sm shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#F2ECE4]/10 text-[#C5A059] rounded-2xs">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif italic text-sm sm:text-base">Painel Administrativo da Noiva</h2>
            <p className="text-xs text-[#E5DFD5]/70 font-sans">Gerenciando {eventInfo.eventTitle || 'Chá de Panela'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-[#FAF9F6]/10 hover:bg-[#FAF9F6]/20 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-[10px] font-bold uppercase tracking-widest rounded-sm transition flex items-center space-x-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloquear</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="no-print flex items-center space-x-2 overflow-x-auto pb-2 border-b border-[#E5DFD5] scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'dashboard'
              ? 'bg-[#2D2D2D] text-white shadow-2xs'
              : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          <Crown className="w-4 h-4 text-[#C5A059]" />
          <span>Visão Consolidada</span>
        </button>

        <button
          onClick={() => setActiveTab('guests')}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'guests'
              ? 'bg-[#2D2D2D] text-white shadow-2xs'
              : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          <Users className="w-4 h-4 text-[#C5A059]" />
          <span>Convidados ({guests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gifts')}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'gifts'
              ? 'bg-[#2D2D2D] text-white shadow-2xs'
              : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          <GiftIcon className="w-4 h-4 text-[#C5A059]" />
          <span>Presentes ({claimedGifts.length}/{gifts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invite')}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'invite'
              ? 'bg-[#2D2D2D] text-white shadow-2xs'
              : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          <Share2 className="w-4 h-4 text-[#C5A059]" />
          <span>Enviar Convites</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-[10px] uppercase tracking-wider font-bold rounded-2xs whitespace-nowrap transition flex items-center space-x-2 ${
            activeTab === 'settings'
              ? 'bg-[#2D2D2D] text-white shadow-2xs'
              : 'bg-[#FAF9F6] text-[#2D2D2D]/70 hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          <Settings className="w-4 h-4 text-[#C5A059]" />
          <span>Configurações</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD / VISÃO CONSOLIDADA */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Confirmed People */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Pessoas Confirmadas</span>
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold font-serif text-stone-800">{totalConfirmedPeople}</span>
                <span className="text-xs text-stone-500">
                  ({confirmedGuests.length} convidados + {totalCompanionsConfirmed} acompanhantes)
                </span>
              </div>
            </div>

            {/* Pending RSVPs */}
            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Presenças Pendentes</span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold font-serif text-stone-800">{pendingGuests.length}</span>
                <span className="text-xs text-stone-500">aguardando resposta</span>
              </div>
            </div>

            {/* Gifts Claimed */}
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Presentes Reservados</span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <GiftIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold font-serif text-stone-800">{claimedGifts.length}</span>
                <span className="text-xs text-stone-500">de {gifts.length} ({claimedPercent}%)</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${claimedPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Declined */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Não Poderão Ir</span>
                <div className="p-2 bg-stone-100 text-stone-600 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold font-serif text-stone-800">{declinedGuests.length}</span>
                <span className="text-xs text-stone-500">recusas enviadas</span>
              </div>
            </div>
          </div>

          {/* Category Progress Breakdown & Guest Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gifts by Category */}
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-stone-800 text-base">Progresso dos Presentes por Categoria</h3>
              <div className="space-y-3">
                {CATEGORIES.map(cat => {
                  const catGifts = gifts.filter(g => g.category === cat);
                  if (catGifts.length === 0) return null;
                  const catClaimed = catGifts.filter(g => g.isClaimed).length;
                  const pct = Math.round((catClaimed / catGifts.length) * 100);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-stone-700">
                        <span>{cat}</span>
                        <span>{catClaimed} / {catGifts.length} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Messages from Guests */}
            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-stone-800 text-base">Recadinhos dos Convidados</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {guests.filter(g => g.message).length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Nenhuma mensagem deixada ainda.</p>
                ) : (
                  guests.filter(g => g.message).map(g => (
                    <div key={g.id} className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-800">{g.name}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(g.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 italic">"{g.message}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUESTS MANAGEMENT */}
      {activeTab === 'guests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-800">Gerenciamento de Convidados</h2>
              <p className="text-xs text-stone-500">Acompanhe as confirmações de presença e acompanhantes</p>
            </div>

            <button
              onClick={() => {
                setSelectedGuestForEdit(null);
                setIsGuestModalOpen(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Convidado</span>
            </button>
          </div>

          {/* Search & Filter bar */}
          <div className="bg-white p-4 rounded-2xl border border-rose-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input 
                type="text"
                placeholder="Buscar convidado por nome, telefone ou e-mail..."
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <select
              value={guestStatusFilter}
              onChange={e => setGuestStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white text-stone-700"
            >
              <option value="all">Todos os Status</option>
              <option value="confirmed">🟢 Confirmados</option>
              <option value="pending">🟡 Pendentes</option>
              <option value="declined">🔴 Recusados</option>
            </select>
          </div>

          {/* Guests Table */}
          <div className="bg-white rounded-3xl border border-rose-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/70 text-stone-700 font-semibold uppercase tracking-wider border-b border-rose-100">
                  <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Acompanhantes</th>
                    <th className="p-4">Contato</th>
                    <th className="p-4">Mensagem</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-400">
                        Nenhum convidado encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map(guest => (
                      <tr key={guest.id} className="hover:bg-rose-50/30 transition">
                        <td className="p-4 font-semibold text-stone-800">
                          {guest.name}
                        </td>
                        <td className="p-4">
                          {guest.status === 'confirmed' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmado</span>
                            </span>
                          )}
                          {guest.status === 'pending' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                          {guest.status === 'declined' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700">
                              <XCircle className="w-3 h-3" />
                              <span>Recusado</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-medium">
                          {guest.companions > 0 ? `+ ${guest.companions}` : 'Sem acompanhante'}
                        </td>
                        <td className="p-4 text-stone-500">
                          {guest.phone || guest.email || '-'}
                        </td>
                        <td className="p-4 max-w-xs truncate text-stone-500 italic">
                          {guest.message || '-'}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          <button
                            onClick={() => handleCopyWhatsAppInvite(guest.name)}
                            title="Mandar Convite WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedGuestForEdit(guest);
                              setIsGuestModalOpen(true);
                            }}
                            title="Editar Convidado"
                            className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteGuest(guest.id)}
                            title="Excluir Convidado"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GIFTS MANAGEMENT */}
      {activeTab === 'gifts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-800">Gestão de Presentes</h2>
              <p className="text-xs text-stone-500">Cadastre itens, edite preferências ou libere presentes escolhidos</p>
            </div>

            <button
              onClick={() => {
                setSelectedGiftForEdit(null);
                setIsGiftModalOpen(true);
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Presente</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="bg-white p-4 rounded-2xl border border-rose-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input 
                type="text"
                placeholder="Buscar presente ou nome do convidado..."
                value={giftSearch}
                onChange={e => setGiftSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <select
              value={giftCategoryFilter}
              onChange={e => setGiftCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white text-stone-700"
            >
              <option value="Todas">Todas as Categorias</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={giftStatusFilter}
              onChange={e => setGiftStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white text-stone-700"
            >
              <option value="all">Todos os Status</option>
              <option value="claimed">🔒 Reservados</option>
              <option value="available">🟢 Disponíveis</option>
            </select>
          </div>

          {/* Gifts Table */}
          <div className="bg-white rounded-3xl border border-rose-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/70 text-stone-700 font-semibold uppercase tracking-wider border-b border-rose-100">
                  <tr>
                    <th className="p-4">Item</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Quem Escolheu</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredGifts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-stone-400">
                        Nenhum presente encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredGifts.map(gift => (
                      <tr key={gift.id} className="hover:bg-rose-50/30 transition">
                        <td className="p-4 font-semibold text-stone-800">
                          <div>{gift.name}</div>
                          {gift.description && (
                            <div className="text-[11px] text-stone-500 font-normal">{gift.description}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                            {gift.category}
                          </span>
                        </td>
                        <td className="p-4">
                          {gift.isClaimed ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                              🔒 Reservado
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              🟢 Disponível
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-medium">
                          {gift.isClaimed ? (
                            <div>
                              <span className="font-bold text-stone-800">{gift.claimedByGuestName || 'Convidado'}</span>
                              {gift.claimedByGuestPhone && (
                                <span className="block text-[10px] text-stone-400">{gift.claimedByGuestPhone}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">Disponível</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          {gift.isClaimed && (
                            <button
                              onClick={() => onUnclaimGift(gift.id)}
                              title="Liberar / Desmarcar Presente"
                              className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                            >
                              Liberar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedGiftForEdit(gift);
                              setIsGiftModalOpen(true);
                            }}
                            title="Editar Presente"
                            className="p-1.5 text-stone-600 hover:bg-stone-100 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteGift(gift.id)}
                            title="Excluir Presente"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ENVIAR CONVITES */}
      {activeTab === 'invite' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl w-fit mx-auto">
              <Share2 className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-800">Gerador de Convite para WhatsApp</h2>
            <p className="text-xs text-stone-500">Copie a mensagem pronta com o link do seu site para enviar no WhatsApp aos convidados!</p>
          </div>

          <div className="bg-stone-900 text-emerald-300 p-5 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
            {getWhatsAppMessage()}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleCopyWhatsAppInvite()}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
            >
              {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedInvite ? 'Texto Copiado!' : 'Copiar Texto para WhatsApp'}</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppMessage())}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* TAB 5: CONFIGURAÇÕES DO EVENTO */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-stone-800">Configurações do Chá de Panela</h2>
            <p className="text-xs text-stone-500">Personalize dados dos noivos, data, horário, local e chave PIX</p>
          </div>

          {settingsSuccess && (
            <div className="p-3 text-xs bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 font-semibold">
              Configurações salvas com sucesso!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Nome da Noiva
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.brideName}
                  onChange={e => setEventForm({ ...eventForm, brideName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Nome do Noivo
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.groomName}
                  onChange={e => setEventForm({ ...eventForm, groomName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Título do Evento
              </label>
              <input 
                type="text"
                required
                value={eventForm.eventTitle}
                onChange={e => setEventForm({ ...eventForm, eventTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Data do Evento
                </label>
                <input 
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Horário
                </label>
                <input 
                  type="text"
                  placeholder="Ex: 15:30"
                  value={eventForm.time}
                  onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Endereço Completo
              </label>
              <input 
                type="text"
                value={eventForm.location}
                onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Link do Google Maps
              </label>
              <input 
                type="url"
                value={eventForm.googleMapsUrl}
                onChange={e => setEventForm({ ...eventForm, googleMapsUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Chave PIX
                </label>
                <input 
                  type="text"
                  value={eventForm.pixKey}
                  onChange={e => setEventForm({ ...eventForm, pixKey: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Titular do PIX
                </label>
                <input 
                  type="text"
                  value={eventForm.pixName}
                  onChange={e => setEventForm({ ...eventForm, pixName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Mensagem de Boas-Vindas aos Convidados
              </label>
              <textarea 
                rows={3}
                value={eventForm.welcomeMessage}
                onChange={e => setEventForm({ ...eventForm, welcomeMessage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Senha de Acesso do Painel
              </label>
              <input 
                type="text"
                value={eventForm.adminPassword}
                onChange={e => setEventForm({ ...eventForm, adminPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setResetConfirming(true)}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Restaurar dados de exemplo
              </button>

              <button
                type="submit"
                disabled={settingsLoading}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                {settingsLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>

          {/* Reset Modal confirmation */}
          {resetConfirming && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-rose-100 text-center">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="font-serif font-bold text-stone-800 text-base">Restaurar Dados?</h3>
                <p className="text-xs text-stone-500">
                  Isso irá restaurar a lista inicial de exemplo com convidados e presentes padrão.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setResetConfirming(false)}
                    className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      await onResetData();
                      setResetConfirming(false);
                      setIsAuthenticated(false);
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl"
                  >
                    Restaurar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest Modal */}
      <GuestModal 
        isOpen={isGuestModalOpen}
        guest={selectedGuestForEdit}
        onClose={() => {
          setIsGuestModalOpen(false);
          setSelectedGuestForEdit(null);
        }}
        onSave={onSaveGuest}
      />

      {/* Gift Modal */}
      <GiftModal 
        isOpen={isGiftModalOpen}
        gift={selectedGiftForEdit}
        onClose={() => {
          setIsGiftModalOpen(false);
          setSelectedGiftForEdit(null);
        }}
        onSave={onSaveGift}
      />
    </div>
  );
};
