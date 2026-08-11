import React, { useState, useEffect } from 'react';
import { AppData, EventInfo, Gift, GiftCategory, Guest, GuestAuthSession, AppRoute } from './types';
import { initialData } from './data/initialData';
import { HomePage } from './components/HomePage';
import { GiftsPage } from './components/GiftsPage';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { Heart, Sparkles, ArrowLeft, Home, User, Gift as GiftIcon, ShieldCheck, Menu, X } from 'lucide-react';
import { 
  subscribeToAuthChanges, 
  logoutFirebase, 
  getCoupleFromFirestore, 
  saveEventInfoToFirestore, 
  saveGiftToFirestore, 
  deleteGiftFromFirestore, 
  saveGuestToFirestore, 
  deleteGuestFromFirestore, 
  loadAllFromFirestore,
  syncAllToFirestore
} from './lib/firebase';

const getCoupleSlug = (brideName?: string, groomName?: string): string => {
  const bride = brideName || 'mariana';
  const groom = groomName || 'lucas';
  return `${bride}-e-${groom}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
};

const getRouteFromPath = (path: string): AppRoute => {
  const p = path.toLowerCase();
  if (p.includes('/casal') || p.includes('/evento') || p.includes('-e-')) return 'casal';
  if (p.includes('/presentes') || p.includes('/gifts')) return 'presentes';
  if (p.includes('/login') || p.includes('/entrar')) return 'login';
  if (p.includes('/noiva') || p.includes('/admin') || p.includes('/painel')) return 'noiva';
  return 'home';
};

const getPathFromRoute = (route: AppRoute, data?: AppData): string => {
  switch (route) {
    case 'casal': {
      if (data?.eventInfo) {
        const slug = getCoupleSlug(data.eventInfo.brideName, data.eventInfo.groomName);
        return `/casal/${slug}`;
      }
      return '/casal/mariana-e-lucas';
    }
    case 'presentes': return '/presentes';
    case 'login': return '/login';
    case 'noiva': return '/noiva';
    case 'home':
    default: return '/';
  }
};

export default function App() {
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // URL-Based Route State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    return getRouteFromPath(window.location.pathname);
  });

  // Guest Authentication Session State
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

  // Listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
        const session: GuestAuthSession = {
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Convidado Firebase',
          email: firebaseUser.email || '',
          provider: isGoogle ? 'google' : 'email'
        };
        setGuestSession(session);
        try {
          localStorage.setItem('cha_guest_session', JSON.stringify(session));
          localStorage.setItem('cha_guest_name', session.name);
          localStorage.setItem('cha_guest_unlocked', 'true');
        } catch (err) {
          console.error(err);
        }

        // Fetch couple record created with this UID in Firestore
        try {
          const coupleRecord = await getCoupleFromFirestore(firebaseUser.uid);
          if (coupleRecord && coupleRecord.eventInfo) {
            setData({
              eventInfo: coupleRecord.eventInfo,
              gifts: coupleRecord.gifts || [],
              guests: coupleRecord.guests || []
            });
          }
        } catch (err) {
          console.warn('Could not load couple record from Firestore:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const navigate = (route: AppRoute) => {
    const path = getPathFromRoute(route, data);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auth Handlers
  const handleLoginSuccess = (name: string, email: string, provider: 'google' | 'email') => {
    const session: GuestAuthSession = { name: name.trim(), email: email.trim(), provider };
    setGuestSession(session);
    try {
      localStorage.setItem('cha_guest_session', JSON.stringify(session));
      localStorage.setItem('cha_guest_name', session.name);
      localStorage.setItem('cha_guest_unlocked', 'true');
    } catch (err) {
      console.error(err);
    }
    showToast(`Bem-vindo, ${session.name}!`);
  };

  const handleLogoutGuest = async () => {
    setGuestSession(null);
    try {
      localStorage.removeItem('cha_guest_session');
      localStorage.removeItem('cha_guest_name');
      localStorage.removeItem('cha_guest_unlocked');
      await logoutFirebase();
    } catch (err) {
      console.error(err);
    }
    showToast('Você saiu da sua conta de convidado.');
  };

  // Fetch data from server & Firestore
  const fetchData = async () => {
    try {
      // 1. Load from Firestore
      const fsData = await loadAllFromFirestore();

      // 2. Load from local Express server
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();

        // If Firestore is empty (first load), push dataset to Firestore automatically!
        if (!fsData || !fsData.eventInfo) {
          syncAllToFirestore(json).catch(err => console.warn('Auto-seed Firestore:', err));
        }

        setData({
          eventInfo: fsData?.eventInfo || json.eventInfo,
          gifts: fsData && fsData.gifts.length > 0 ? fsData.gifts : json.gifts,
          guests: fsData && fsData.guests.length > 0 ? fsData.guests : json.guests,
        });
      } else if (fsData && fsData.eventInfo) {
        setData({
          eventInfo: fsData.eventInfo,
          gifts: fsData.gifts || [],
          guests: fsData.guests || []
        });
      }
    } catch (err) {
      console.warn('Could not fetch data, using local state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast('Link do Chá de Panela copiado!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // API Call Handlers with direct Firestore sync
  const handleClaimGift = async (giftId: string, claimData: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => {
    const targetGift = data.gifts.find(g => g.id === giftId);
    if (targetGift) {
      const updatedGift: Gift = {
        ...targetGift,
        isClaimed: true,
        claimedByGuestName: claimData.guestName,
        claimedByGuestEmail: claimData.guestEmail,
        claimedByGuestPhone: claimData.guestPhone,
        notes: claimData.notes
      };
      await saveGiftToFirestore(updatedGift);
    }

    const res = await fetch(`/api/gifts/${giftId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimData)
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Erro ao escolher presente');
    }

    await fetchData();
    showToast(`Presente reservado por ${claimData.guestName}! ❤️`);
  };

  const handleAddCustomGift = async (giftData: { name: string; category: GiftCategory; description?: string; priceRange?: string; isCustom?: boolean; claimedByGuestName?: string }) => {
    const newGift: Gift = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: giftData.name,
      category: giftData.category,
      description: giftData.description || '',
      priceRange: giftData.priceRange || 'Até R$ 100',
      isClaimed: !!giftData.claimedByGuestName,
      claimedByGuestName: giftData.claimedByGuestName || '',
      isCustom: true
    };
    await saveGiftToFirestore(newGift);

    const res = await fetch('/api/gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giftData)
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Erro ao sugerir presente');
    }

    await fetchData();
    showToast('Presente adicionado com sucesso!');
  };

  const handleSubmitRsvp = async (rsvpData: { name: string; email?: string; phone?: string; companions: number; status: 'confirmed' | 'declined'; message?: string }) => {
    const newGuest: Guest = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: rsvpData.name,
      email: rsvpData.email || '',
      phone: rsvpData.phone || '',
      companions: rsvpData.companions || 0,
      status: rsvpData.status,
      message: rsvpData.message || '',
      updatedAt: new Date().toISOString()
    };
    await saveGuestToFirestore(newGuest);

    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Erro ao enviar confirmação');
    }

    await fetchData();
    showToast('Confirmação de presença registrada com sucesso!');
  };

  const handleUpdateEventInfo = async (info: Partial<EventInfo>) => {
    await saveEventInfoToFirestore(info);

    const res = await fetch('/api/event', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });

    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    await fetchData();
    showToast('Informações do evento salvas no Firebase!');
  };

  const handleRegisterCouple = async (info: Partial<EventInfo>) => {
    await saveEventInfoToFirestore(info);

    const res = await fetch('/api/register-couple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });

    if (!res.ok) throw new Error('Erro ao cadastrar novo casal');
    await fetchData();
    showToast('Chá de Panela cadastrado para o casal!');
  };

  const handleClearGuests = async () => {
    const res = await fetch('/api/clear-guests', { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao zerar convidados');
    await fetchData();
    showToast('Lista de convidados zerada!');
  };

  const handleClearGifts = async () => {
    const res = await fetch('/api/clear-gifts', { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao zerar lista de presentes');
    await fetchData();
    showToast('Lista de presentes zerada com sucesso!');
  };

  const handleImportTemplateGifts = async () => {
    const res = await fetch('/api/import-template-gifts', { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao importar sugestões');
    await fetchData();
    showToast('20 sugestões de presentes carregadas com sucesso!');
  };

  const handleSaveGuest = async (guestData: Omit<Guest, 'id' | 'updatedAt'> & { id?: string }) => {
    const guestObj: Guest = {
      id: guestData.id || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: guestData.name,
      email: guestData.email || '',
      phone: guestData.phone || '',
      companions: guestData.companions || 0,
      status: guestData.status || 'confirmed',
      dietaryNotes: guestData.dietaryNotes || '',
      message: guestData.message || '',
      updatedAt: new Date().toISOString()
    };
    await saveGuestToFirestore(guestObj);

    const method = guestData.id ? 'PUT' : 'POST';
    const url = guestData.id ? `/api/guests/${guestData.id}` : '/api/guests';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData)
    });

    if (!res.ok) throw new Error('Erro ao salvar convidado');
    await fetchData();
    showToast('Convidado salvo!');
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este convidado?')) return;
    await deleteGuestFromFirestore(id);

    const res = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir convidado');
    await fetchData();
    showToast('Convidado removido!');
  };

  const handleSaveGift = async (giftData: Omit<Gift, 'id'> & { id?: string }) => {
    const giftObj: Gift = {
      id: giftData.id || `gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: giftData.name,
      category: giftData.category,
      description: giftData.description || '',
      priceRange: giftData.priceRange || 'Até R$ 100',
      isClaimed: !!giftData.isClaimed,
      claimedByGuestName: giftData.claimedByGuestName || '',
      isCustom: !!giftData.isCustom
    };
    await saveGiftToFirestore(giftObj);

    const method = giftData.id ? 'PUT' : 'POST';
    const url = giftData.id ? `/api/gifts/${giftData.id}` : '/api/gifts';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giftData)
    });

    if (!res.ok) throw new Error('Erro ao salvar presente');
    await fetchData();
    showToast('Presente salvo!');
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este presente da lista?')) return;
    await deleteGiftFromFirestore(id);

    const res = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir presente');
    await fetchData();
    showToast('Presente excluído!');
  };

  const handleUnclaimGift = async (id: string) => {
    const res = await fetch(`/api/gifts/${id}/unclaim`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao liberar presente');
    await fetchData();
    showToast('Presente liberado para a lista novamente!');
  };

  const handleResetData = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao restaurar dados');
    await fetchData();
    showToast('Dados restaurados!');
  };

  const availableGiftsCount = data.gifts.filter(g => !g.isClaimed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50/40 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-serif text-stone-700 font-semibold text-sm">Carregando Chá de Panela...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#2D2D2D] font-sans flex flex-col justify-between selection:bg-[#C5A059]/20 selection:text-[#2D2D2D]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2D2D2D] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-bounce border border-[#E5DFD5]/20">
          <Sparkles className="w-4 h-4 text-[#C5A059]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="no-print bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#E5DFD5] shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button 
            onClick={() => navigate('home')}
            className="flex items-center space-x-2 text-[#2D2D2D] font-bold hover:opacity-80 transition cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F2ECE4] border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
              <Heart className="w-5 h-5 fill-current text-[#C5A059]" />
            </div>
            <div className="text-left">
              <span className="font-serif tracking-tight text-base sm:text-lg font-bold block leading-none">Chá de Panela</span>
              <span className="text-[10px] text-[#C5A059] font-sans font-semibold tracking-wider uppercase block sm:hidden">
                {data.eventInfo.brideName} & {data.eventInfo.groomName}
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => navigate('home')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                currentRoute === 'home' 
                  ? 'bg-[#2D2D2D] text-white shadow-xs' 
                  : 'text-[#2D2D2D]/80 hover:bg-[#F2ECE4]'
              }`}
            >
              <Home className="w-4 h-4 text-[#C5A059]" />
              <span>Início</span>
            </button>

            <button
              onClick={() => navigate('casal')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                currentRoute === 'casal' 
                  ? 'bg-[#2D2D2D] text-white shadow-xs' 
                  : 'text-[#2D2D2D]/80 hover:bg-[#F2ECE4]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>Site do Casal</span>
            </button>

            <button
              onClick={() => navigate('presentes')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                currentRoute === 'presentes' 
                  ? 'bg-[#2D2D2D] text-white shadow-xs' 
                  : 'text-[#2D2D2D]/80 hover:bg-[#F2ECE4]'
              }`}
            >
              <GiftIcon className="w-4 h-4 text-[#C5A059]" />
              <span>Presentes</span>
            </button>

            <button
              onClick={() => navigate('noiva')}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer border flex items-center space-x-1.5 ${
                currentRoute === 'noiva' 
                  ? 'bg-[#C5A059] text-white border-[#C5A059] shadow-xs' 
                  : 'border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059]/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Painel do Casal</span>
            </button>

            {/* Logged in User Identification Chip */}
            {guestSession && (
              <div className="flex items-center space-x-2 bg-[#F2ECE4] border border-[#E5DFD5] px-3 py-1.5 rounded-xl text-xs font-bold text-[#2D2D2D] ml-2 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#C5A059] text-white flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0">
                  {guestSession.name.charAt(0)}
                </div>
                <span className="truncate max-w-[120px] font-semibold text-xs text-[#2D2D2D]">
                  {guestSession.name.split(' ')[0]}
                </span>
                <button 
                  onClick={handleLogoutGuest} 
                  title="Sair da conta" 
                  className="text-[#2D2D2D]/50 hover:text-rose-600 transition p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="sm:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 bg-[#FAF9F6] border border-[#E5DFD5] text-[#2D2D2D] rounded-xl hover:bg-[#F2ECE4] transition cursor-pointer active:scale-95 shadow-2xs flex items-center space-x-1.5"
              aria-label="Menu Principal"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-[#C5A059]" />
              ) : (
                <Menu className="w-5 h-5 text-[#2D2D2D]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Mobile Slide Hamburger Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col bg-[#2D2D2D]/70 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-white w-full border-b-2 border-[#C5A059] p-5 shadow-2xl rounded-b-[2rem] space-y-5 animate-slide-down">
            <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#F2ECE4] border border-[#E5DFD5] flex items-center justify-center text-[#C5A059] shadow-2xs">
                  <Heart className="w-5 h-5 fill-current text-[#C5A059]" />
                </div>
                <div>
                  <span className="font-serif font-bold text-base text-[#2D2D2D] block leading-none">Chá de Panela</span>
                  <span className="text-[10px] font-extrabold text-[#C5A059] uppercase tracking-widest block pt-1">
                    {data.eventInfo.brideName} & {data.eventInfo.groomName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-[#FAF9F6] border border-[#E5DFD5] text-[#2D2D2D] rounded-xl hover:bg-[#F2ECE4] transition cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5 text-[#C5A059]" />
              </button>
            </div>

            <nav className="space-y-2.5">
              <button
                onClick={() => { navigate('home'); setIsMobileMenuOpen(false); }}
                className={`w-full p-4 rounded-2xl transition flex items-center justify-between text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  currentRoute === 'home' 
                    ? 'bg-[#2D2D2D] text-white shadow-md' 
                    : 'bg-[#FAF9F6] text-[#2D2D2D] border border-[#E5DFD5] hover:bg-[#F2ECE4]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Home className="w-4 h-4 text-[#C5A059]" />
                  <span>Início</span>
                </div>
                {currentRoute === 'home' && <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />}
              </button>

              <button
                onClick={() => { navigate('casal'); setIsMobileMenuOpen(false); }}
                className={`w-full p-4 rounded-2xl transition flex items-center justify-between text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  currentRoute === 'casal' 
                    ? 'bg-[#2D2D2D] text-white shadow-md' 
                    : 'bg-[#FAF9F6] text-[#2D2D2D] border border-[#E5DFD5] hover:bg-[#F2ECE4]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Site do Casal ({data.eventInfo.brideName} & {data.eventInfo.groomName})</span>
                </div>
                {currentRoute === 'casal' && <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />}
              </button>

              <button
                onClick={() => { navigate('presentes'); setIsMobileMenuOpen(false); }}
                className={`w-full p-4 rounded-2xl transition flex items-center justify-between text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  currentRoute === 'presentes' 
                    ? 'bg-[#2D2D2D] text-white shadow-md' 
                    : 'bg-[#FAF9F6] text-[#2D2D2D] border border-[#E5DFD5] hover:bg-[#F2ECE4]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <GiftIcon className="w-4 h-4 text-[#C5A059]" />
                  <span>Lista de Presentes</span>
                </div>
                {availableGiftsCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#C5A059] text-white text-[10px] font-extrabold rounded-full shadow-2xs">
                    {availableGiftsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { navigate('noiva'); setIsMobileMenuOpen(false); }}
                className={`w-full p-4 rounded-2xl transition flex items-center justify-between text-xs font-bold uppercase tracking-wider cursor-pointer ${
                  currentRoute === 'noiva' 
                    ? 'bg-[#C5A059] text-white shadow-md' 
                    : 'bg-[#FAF9F6] text-[#C5A059] border border-[#C5A059]/40 hover:bg-[#C5A059]/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Painel do Casal</span>
                </div>
              </button>

              {/* Logged in User Identification Chip on Mobile */}
              {guestSession && (
                <div className="p-4 bg-[#F2ECE4] border border-[#E5DFD5] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#C5A059] text-white flex items-center justify-center text-xs font-extrabold uppercase shrink-0">
                      {guestSession.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#C5A059] block leading-none">
                        Usuário Logado
                      </span>
                      <span className="text-xs font-extrabold text-[#2D2D2D] truncate block pt-1">
                        {guestSession.name}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => { handleLogoutGuest(); setIsMobileMenuOpen(false); }} 
                    className="px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Sair
                  </button>
                </div>
              )}
            </nav>

            <div className="pt-2 text-center text-[11px] text-[#2D2D2D]/60 font-sans">
              Toque fora do menu para fechar
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area based on URL Route */}
      <main className="flex-1 w-full py-4 sm:py-8 px-2 sm:px-4">
        {currentRoute === 'home' && (
          <LandingPage 
            eventInfo={data.eventInfo}
            onNavigate={navigate}
            onUpdateEventInfo={handleUpdateEventInfo}
            onRegisterCouple={handleRegisterCouple}
          />
        )}

        {currentRoute === 'casal' && (
          <HomePage 
            eventInfo={data.eventInfo}
            guests={data.guests}
            guestSession={guestSession}
            onSubmitRsvp={handleSubmitRsvp}
            onNavigate={navigate}
            availableGiftsCount={availableGiftsCount}
          />
        )}

        {currentRoute === 'presentes' && (
          <GiftsPage 
            gifts={data.gifts}
            guestSession={guestSession}
            onClaimGift={handleClaimGift}
            onUnclaimGift={handleUnclaimGift}
            onAddCustomGift={handleAddCustomGift}
            onNavigate={navigate}
          />
        )}

        {currentRoute === 'login' && (
          <LoginPage 
            guestSession={guestSession}
            onLoginSuccess={handleLoginSuccess}
            onLogoutGuest={handleLogoutGuest}
            onNavigate={navigate}
          />
        )}

        {currentRoute === 'noiva' && (
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-[#E5DFD5] shadow-xs">
              <span className="font-serif italic font-bold text-lg text-[#2D2D2D]">
                Painel do Casal ({data.eventInfo.brideName} & {data.eventInfo.groomName})
              </span>
              <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider bg-[#F2ECE4] px-3 py-1 rounded-full border border-[#E5DFD5]">
                Acesso Restrito
              </span>
            </div>
            <AdminPanel 
              eventInfo={data.eventInfo}
              gifts={data.gifts}
              guests={data.guests}
              onUpdateEventInfo={handleUpdateEventInfo}
              onSaveGuest={handleSaveGuest}
              onDeleteGuest={handleDeleteGuest}
              onSaveGift={handleSaveGift}
              onDeleteGift={handleDeleteGift}
              onUnclaimGift={handleUnclaimGift}
              onResetData={handleResetData}
              onClearGuests={handleClearGuests}
              onClearGifts={handleClearGifts}
              onImportTemplateGifts={handleImportTemplateGifts}
            />
          </div>
        )}
      </main>

      {/* Footer minimal */}
      {currentRoute === 'home' ? (
        <footer className="no-print py-8 text-center text-xs text-[#2D2D2D]/60 border-t border-[#E5DFD5] bg-[#FAF9F6]">
          <div className="flex items-center justify-center space-x-2 font-extrabold text-sm text-[#2D2D2D]">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <span>Plataforma Chá de Panela</span>
          </div>
          <p className="mt-1.5 text-xs text-[#2D2D2D]/70 font-medium max-w-sm mx-auto">
            Crie o site personalizado, receba confirmações de presença e gerencie sua lista de presentes em um só lugar.
          </p>
        </footer>
      ) : (
        <footer className="no-print py-6 text-center text-xs text-[#2D2D2D]/50 border-t border-[#E5DFD5]/60 bg-white/50">
          <div className="flex items-center justify-center space-x-1 font-serif text-sm text-[#2D2D2D]">
            <span>{data.eventInfo.brideName}</span>
            <Heart className="w-3.5 h-3.5 text-[#C5A059] fill-current" />
            <span>{data.eventInfo.groomName}</span>
          </div>
          <p className="mt-1 text-[11px] font-sans text-[#2D2D2D]/60">Chá de Panela • Lista de Presentes & Confirmação de Presença</p>
        </footer>
      )}
    </div>
  );
}
