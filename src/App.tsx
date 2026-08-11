import React, { useState, useEffect } from 'react';
import { AppData, EventInfo, Gift, GiftCategory, Guest, GuestAuthSession, AppRoute, CoupleProfile } from './types';
import { initialData } from './data/initialData';
import { HomePage } from './components/HomePage';
import { GiftsPage } from './components/GiftsPage';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { HeaderNav } from './components/HeaderNav';
import { Heart, Sparkles, ArrowLeft, Home, User, Gift as GiftIcon, ShieldCheck, Menu, X, Terminal } from 'lucide-react';
import { 
  subscribeToAuthChanges, 
  logoutFirebase, 
  getCoupleFromFirestore, 
  saveCoupleToFirestore,
  saveEventInfoToFirestore, 
  saveGiftToFirestore, 
  deleteGiftFromFirestore, 
  saveGuestToFirestore, 
  deleteGuestFromFirestore, 
  loadAllFromFirestore,
  syncAllToFirestore,
  getAllCouplesFromFirestore,
  auth
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
  if (p.includes('/superadmin') || p.includes('/euques')) return 'superadmin';
  if (p.includes('/casal') || p.includes('/evento') || p.includes('-e-')) return 'casal';
  if (p.includes('/presentes') || p.includes('/gifts')) return 'presentes';
  if (p.includes('/login') || p.includes('/entrar')) return 'login';
  if (p.includes('/noiva') || p.includes('/admin') || p.includes('/painel')) return 'noiva';
  return 'home';
};

const getPathFromRoute = (route: AppRoute, data?: AppData): string => {
  switch (route) {
    case 'superadmin': return '/superadmin';
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
  const [registeredCouples, setRegisteredCouples] = useState<CoupleProfile[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
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
            setSelectedCoupleId(firebaseUser.uid);
          } else if (sessionStorage.getItem('cha_couple_authenticated') === 'true') {
            // New couple profile initialization with clean empty fields
            const brideDefault = firebaseUser.displayName?.split(' ')[0] || firebaseUser.email?.split('@')[0] || '';
            const newEventInfo: EventInfo = {
              id: firebaseUser.uid,
              brideName: brideDefault,
              groomName: '',
              eventTitle: brideDefault ? `Chá de Panela de ${brideDefault}` : '',
              date: '',
              time: '',
              location: '',
              description: '',
              coverImage: '',
              pixKey: '',
              pixName: firebaseUser.displayName || ''
            };
            const newGifts: Gift[] = [];
            const newGuests: Guest[] = [];

            await saveCoupleToFirestore(firebaseUser.uid, newEventInfo, newGifts, newGuests);
            
            setData({
              eventInfo: newEventInfo,
              gifts: newGifts,
              guests: newGuests
            });
            setSelectedCoupleId(firebaseUser.uid);

            const updatedCouples = await getAllCouplesFromFirestore();
            setRegisteredCouples(updatedCouples);
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
      // Load all couples registered in Firestore
      const couplesList = await getAllCouplesFromFirestore();
      setRegisteredCouples(couplesList);

      // If an authenticated couple exists, load their specific document
      const isCouple = auth.currentUser && (sessionStorage.getItem('cha_couple_authenticated') === 'true' || currentRoute === 'noiva');
      if (isCouple && auth.currentUser) {
        const coupleRecord = await getCoupleFromFirestore(auth.currentUser.uid);
        if (coupleRecord && coupleRecord.eventInfo) {
          setData({
            eventInfo: coupleRecord.eventInfo,
            gifts: coupleRecord.gifts || [],
            guests: coupleRecord.guests || []
          });
          setSelectedCoupleId(auth.currentUser.uid);
          setLoading(false);
          return;
        } else {
          // Initialize fresh couple profile for auth.currentUser.uid with clean empty fields
          const brideDefault = auth.currentUser.displayName?.split(' ')[0] || auth.currentUser.email?.split('@')[0] || '';
          const newEventInfo: EventInfo = {
            id: auth.currentUser.uid,
            brideName: brideDefault,
            groomName: '',
            eventTitle: brideDefault ? `Chá de Panela de ${brideDefault}` : '',
            date: '',
            time: '',
            location: '',
            description: '',
            coverImage: '',
            pixKey: '',
            pixName: auth.currentUser.displayName || ''
          };
          const newGifts: Gift[] = [];
          const newGuests: Guest[] = [];

          await saveCoupleToFirestore(auth.currentUser.uid, newEventInfo, newGifts, newGuests);
          
          setData({
            eventInfo: newEventInfo,
            gifts: newGifts,
            guests: newGuests
          });
          setSelectedCoupleId(auth.currentUser.uid);
          setLoading(false);

          const updatedCouples = await getAllCouplesFromFirestore();
          setRegisteredCouples(updatedCouples);
          return;
        }
      }

      // If a specific couple is selected (from URL or selection)
      if (selectedCoupleId) {
        const found = couplesList.find(c => c.id === selectedCoupleId);
        if (found) {
          setData({
            eventInfo: found.eventInfo,
            gifts: found.gifts || [],
            guests: found.guests || []
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: If registered couples exist, select the first
      if (couplesList.length > 0) {
        const first = couplesList[0];
        setData({
          eventInfo: first.eventInfo,
          gifts: first.gifts || [],
          guests: first.guests || []
        });
        setSelectedCoupleId(first.id);
        setLoading(false);
        return;
      }

      // Final Fallback
      const fsData = await loadAllFromFirestore();
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
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
    const updatedGifts = data.gifts.map(g => {
      if (g.id === giftId) {
        return {
          ...g,
          isClaimed: true,
          claimedByGuestName: claimData.guestName,
          claimedByGuestEmail: claimData.guestEmail,
          claimedByGuestPhone: claimData.guestPhone,
          notes: claimData.notes
        };
      }
      return g;
    });

    const activeCoupleId = selectedCoupleId || auth.currentUser?.uid || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    } else {
      const targetGift = updatedGifts.find(g => g.id === giftId);
      if (targetGift) await saveGiftToFirestore(targetGift);
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
    const updatedGuests = [...data.guests, newGuest];

    const activeCoupleId = selectedCoupleId || auth.currentUser?.uid || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, data.gifts, updatedGuests);
    } else {
      await saveGuestToFirestore(newGuest);
    }

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
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    const updatedEvent: EventInfo = { ...data.eventInfo, ...info, id: activeCoupleId || data.eventInfo.id };

    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, updatedEvent, data.gifts, data.guests);
    } else {
      await saveEventInfoToFirestore(info);
    }

    const res = await fetch('/api/event', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });

    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    await fetchData();
    showToast('Informações do evento salvas com sucesso!');
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

    const existingIndex = data.guests.findIndex(g => g.id === guestObj.id);
    let updatedGuests: Guest[];
    if (existingIndex >= 0) {
      updatedGuests = [...data.guests];
      updatedGuests[existingIndex] = guestObj;
    } else {
      updatedGuests = [...data.guests, guestObj];
    }

    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, data.gifts, updatedGuests);
    } else {
      await saveGuestToFirestore(guestObj);
    }

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
    const updatedGuests = data.guests.filter(g => g.id !== id);
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, data.gifts, updatedGuests);
    } else {
      await deleteGuestFromFirestore(id);
    }

    const res = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir convidado');
    await fetchData();
    showToast('Convidado removido!');
  };

  const handleSaveGift = async (giftData: Omit<Gift, 'id'> & { id?: string }) => {
    const giftId = giftData.id || `gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const giftObj: Gift = {
      id: giftId,
      name: giftData.name,
      category: giftData.category,
      description: giftData.description || '',
      priceRange: giftData.priceRange || 'Até R$ 100',
      isClaimed: !!giftData.isClaimed,
      claimedByGuestName: giftData.claimedByGuestName || '',
      isCustom: !!giftData.isCustom
    };

    const existingIndex = data.gifts.findIndex(g => g.id === giftId);
    let updatedGifts: Gift[];
    if (existingIndex >= 0) {
      updatedGifts = [...data.gifts];
      updatedGifts[existingIndex] = giftObj;
    } else {
      updatedGifts = [...data.gifts, giftObj];
    }

    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    } else {
      await saveGiftToFirestore(giftObj);
    }

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
    const updatedGifts = data.gifts.filter(g => g.id !== id);
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    } else {
      await deleteGiftFromFirestore(id);
    }

    const res = await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir presente');
    await fetchData();
    showToast('Presente excluído!');
  };

  const handleUnclaimGift = async (id: string) => {
    const updatedGifts = data.gifts.map(g => {
      if (g.id === id) {
        return {
          ...g,
          isClaimed: false,
          claimedByGuestName: undefined,
          claimedByGuestEmail: undefined,
          claimedByGuestPhone: undefined,
          notes: undefined
        };
      }
      return g;
    });
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || data.eventInfo.id;
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    }

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

      {/* Smart Main Header Nav */}
      <HeaderNav 
        currentRoute={currentRoute}
        onNavigate={navigate}
        eventInfo={data.eventInfo}
        guestSession={guestSession}
        onCopyLink={handleCopyLink}
        copiedLink={copiedLink}
        availableGiftsCount={availableGiftsCount}
      />

      {/* Main Content Area based on URL Route */}
      <main className="flex-1 w-full py-4 sm:py-8 px-2 sm:px-4 pb-8">
        {currentRoute === 'home' && (
          <LandingPage 
            couples={registeredCouples}
            onNavigate={navigate}
            onSelectCouple={(id) => {
              setSelectedCoupleId(id);
              const found = registeredCouples.find(c => c.id === id);
              if (found) {
                setData({
                  eventInfo: found.eventInfo,
                  gifts: found.gifts || [],
                  guests: found.guests || []
                });
              }
            }}
          />
        )}

        {currentRoute === 'superadmin' && (
          (guestSession?.email?.toLowerCase() === 'euques@gmail.com' && typeof window !== 'undefined' && sessionStorage.getItem('cha_superadmin_authenticated') === 'true') ? (
            <SuperAdminPanel 
              onNavigate={navigate}
              onSelectCoupleForAdmin={(id) => {
                setSelectedCoupleId(id);
                const found = registeredCouples.find(c => c.id === id);
                if (found) {
                  setData({
                    eventInfo: found.eventInfo,
                    gifts: found.gifts || [],
                    guests: found.guests || []
                  });
                }
              }}
            />
          ) : (
            <LandingPage 
              couples={registeredCouples}
              onNavigate={navigate}
              onSelectCouple={(id) => {
                setSelectedCoupleId(id);
                const found = registeredCouples.find(c => c.id === id);
                if (found) {
                  setData({
                    eventInfo: found.eventInfo,
                    gifts: found.gifts || [],
                    guests: found.guests || []
                  });
                }
              }}
            />
          )
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
            eventInfo={data.eventInfo}
            onLoginSuccess={handleLoginSuccess}
            onLogoutGuest={handleLogoutGuest}
            onNavigate={navigate}
          />
        )}

        {currentRoute === 'noiva' && (
          <div className="max-w-7xl mx-auto space-y-4">
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
      {(currentRoute === 'home' || currentRoute === 'login' || currentRoute === 'superadmin' || currentRoute === 'noiva') ? (
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
        <footer className="no-print py-6 text-center text-[#2D2D2D]/50 text-xs border-t border-[#E5DFD5]/60 bg-white/50">
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
