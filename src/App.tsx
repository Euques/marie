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
  updateCoupleGiftsInFirestore,
  subscribeToCoupleRealtime,
  saveEventInfoToFirestore, 
  saveGiftToFirestore, 
  deleteGiftFromFirestore, 
  saveGuestToFirestore, 
  deleteGuestFromFirestore, 
  loadAllFromFirestore,
  syncAllToFirestore,
  getAllCouplesFromFirestore,
  subscribeToAllCouplesRealtime,
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
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCouple = urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c');
      if (urlCouple) return urlCouple;
      return localStorage.getItem('cha_selected_couple_id') || null;
    }
    return null;
  });
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

        // ONLY manage couple profile if user is explicitly authenticated as couple admin
        const isCoupleAuth = sessionStorage.getItem('cha_couple_authenticated') === 'true';
        if (isCoupleAuth) {
          try {
            const couplesList = await getAllCouplesFromFirestore();
            setRegisteredCouples(couplesList);
            const matchedFromList = couplesList.find(
              c => c.id === firebaseUser.uid || c.aliasIds?.includes(firebaseUser.uid)
            );
            const coupleRecord = matchedFromList || (await getCoupleFromFirestore(firebaseUser.uid));

            if (coupleRecord && coupleRecord.eventInfo) {
              const resolvedId = coupleRecord.id || firebaseUser.uid;
              setData({
                eventInfo: coupleRecord.eventInfo,
                gifts: coupleRecord.gifts || [],
                guests: coupleRecord.guests || []
              });
              setSelectedCoupleId(resolvedId);
              localStorage.setItem('cha_selected_couple_id', resolvedId);
            }
          } catch (err) {
            console.warn('Could not load couple record from Firestore:', err);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization for all couples (keeps LandingPage & merged profiles live)
  useEffect(() => {
    const unsubAll = subscribeToAllCouplesRealtime((couplesList) => {
      setRegisteredCouples(couplesList);
      const urlParams = new URLSearchParams(window.location.search);
      const urlCoupleId = urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c');
      const activeId = urlCoupleId || selectedCoupleId;
      if (activeId) {
        const matched = couplesList.find(c => c.id === activeId || c.aliasIds?.includes(activeId));
        if (matched && matched.eventInfo) {
          setData(prev => ({
            ...prev,
            eventInfo: matched.eventInfo || prev.eventInfo,
            gifts: matched.gifts || prev.gifts,
            guests: matched.guests || prev.guests
          }));
        }
      }
    });
    return () => unsubAll();
  }, [selectedCoupleId]);

  // Real-time synchronization: listen for live changes to the current couple's gifts
  useEffect(() => {
    const activeId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (!activeId) return;

    const unsub = subscribeToCoupleRealtime(activeId, (coupleRecord) => {
      if (coupleRecord && coupleRecord.eventInfo) {
        setData(prev => ({
          ...prev,
          eventInfo: coupleRecord.eventInfo || prev.eventInfo,
          gifts: coupleRecord.gifts || prev.gifts,
          guests: coupleRecord.guests || prev.guests
        }));
      }
    });

    return () => unsub();
  }, [selectedCoupleId, data.eventInfo?.id]);

  const navigate = (route: AppRoute) => {
    let path = getPathFromRoute(route, data);
    const activeId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeId && route !== 'home' && route !== 'superadmin' && route !== 'noiva') {
      const separator = path.includes('?') ? '&' : '?';
      path = `${path}${separator}casal=${encodeURIComponent(activeId)}`;
    }
    if (window.location.pathname + window.location.search !== path) {
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
      localStorage.removeItem('cha_guest_rsvp_confirmed');
      if (selectedCoupleId) {
        localStorage.removeItem(`cha_guest_rsvp_confirmed_${selectedCoupleId}`);
      }
      await logoutFirebase();
    } catch (err) {
      console.error(err);
    }
    showToast('Você saiu da sua conta de convidado.');
  };

  // Load a specific couple profile by ID (or alias ID)
  const handleLoadCouple = async (coupleId: string) => {
    try {
      const couplesList = await getAllCouplesFromFirestore();
      setRegisteredCouples(couplesList);
      const found =
        couplesList.find(c => c.id === coupleId || c.aliasIds?.includes(coupleId)) ||
        (await getCoupleFromFirestore(coupleId));

      if (found && found.eventInfo) {
        const resolvedId = found.id || coupleId;
        setData({
          eventInfo: found.eventInfo,
          gifts: found.gifts || [],
          guests: found.guests || []
        });
        setSelectedCoupleId(resolvedId);
        localStorage.setItem('cha_selected_couple_id', resolvedId);
      }
    } catch (err) {
      console.warn('Error loading couple:', err);
    }
  };

  // Fetch data from server & Firestore
  const fetchData = async () => {
    try {
      // Load all couples registered in Firestore
      const couplesList = await getAllCouplesFromFirestore();
      setRegisteredCouples(couplesList);

      const urlParams = new URLSearchParams(window.location.search);
      const urlCoupleId = urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c');

      // If an authenticated couple admin is on the admin panel without an explicit guest URL override
      const isCouple =
        auth.currentUser &&
        !auth.currentUser.isAnonymous &&
        sessionStorage.getItem('cha_couple_authenticated') === 'true' &&
        !urlCoupleId;

      if (isCouple && auth.currentUser) {
        const matchedFromList = couplesList.find(
          c => c.id === auth.currentUser!.uid || c.aliasIds?.includes(auth.currentUser!.uid)
        );
        const coupleRecord = matchedFromList || (await getCoupleFromFirestore(auth.currentUser.uid));
        if (coupleRecord && coupleRecord.eventInfo) {
          const resolvedId = coupleRecord.id || auth.currentUser.uid;
          setData({
            eventInfo: coupleRecord.eventInfo,
            gifts: coupleRecord.gifts || [],
            guests: coupleRecord.guests || []
          });
          setSelectedCoupleId(resolvedId);
          localStorage.setItem('cha_selected_couple_id', resolvedId);
          setLoading(false);
          return;
        }
      }

      // If a specific couple is requested via URL parameter or selection
      const targetCoupleId =
        urlCoupleId ||
        selectedCoupleId ||
        (typeof window !== 'undefined' ? localStorage.getItem('cha_selected_couple_id') : null);

      if (targetCoupleId) {
        let found = couplesList.find(c => c.id === targetCoupleId || c.aliasIds?.includes(targetCoupleId));
        if (!found) {
          try {
            const directRecord = await getCoupleFromFirestore(targetCoupleId);
            if (directRecord && directRecord.eventInfo) {
              // Check if there is a merged couple with the same bride & groom names
              const b = (directRecord.eventInfo.brideName || '').trim().toLowerCase();
              const g = (directRecord.eventInfo.groomName || '').trim().toLowerCase();
              const byNames = b ? couplesList.find(
                c =>
                  (c.eventInfo?.brideName || '').trim().toLowerCase() === b &&
                  (c.eventInfo?.groomName || '').trim().toLowerCase() === g
              ) : undefined;
              found = byNames || directRecord;
            }
          } catch (e) {
            console.warn('Could not load target couple directly from Firestore:', e);
          }
        }

        if (found && found.eventInfo) {
          const resolvedId = found.id || targetCoupleId;
          setData({
            eventInfo: found.eventInfo,
            gifts: found.gifts || [],
            guests: found.guests || []
          });
          setSelectedCoupleId(resolvedId);
          localStorage.setItem('cha_selected_couple_id', resolvedId);
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
        localStorage.setItem('cha_selected_couple_id', first.id);
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
    // Validação: não permitir escolher presente já escolhido por outro convidado
    const existingGift = data.gifts.find(g => g.id === giftId);
    if (existingGift?.isClaimed && existingGift.claimedByGuestName && existingGift.claimedByGuestName.trim().toLowerCase() !== claimData.guestName.trim().toLowerCase()) {
      showToast('Este presente já foi reservado por outro convidado!');
      return;
    }

    const updatedGifts = data.gifts.map(g => {
      if (g.id === giftId) {
        return {
          ...g,
          isClaimed: true,
          claimedByGuestName: claimData.guestName,
          claimedByGuestEmail: claimData.guestEmail,
          claimedByGuestPhone: claimData.guestPhone,
          notes: claimData.notes,
          claimedAt: new Date().toISOString()
        };
      }
      return g;
    });

    // 1. Atualização em tempo real instantânea na tela do convidado (0ms)
    setData(prev => ({
      ...prev,
      gifts: updatedGifts
    }));

    showToast(`Presente reservado por ${claimData.guestName}! ❤️`);

    // 2. Salva na lista do casal existente em nuvem (NUNCA cria um casal novo)
    const activeCoupleId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await updateCoupleGiftsInFirestore(activeCoupleId, updatedGifts);
    } else {
      const targetGift = updatedGifts.find(g => g.id === giftId);
      if (targetGift) await saveGiftToFirestore(targetGift);
    }

    // 3. Sincroniza em segundo plano sem descarregar a página nem resetar estado
    try {
      await fetch(`/api/gifts/${giftId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData)
      });
    } catch (err) {
      console.warn('Server claim sync notice:', err);
    }
  };

  const handleAddCustomGift = async (giftData: { name: string; category: GiftCategory; description?: string; priceRange?: string; imageUrl?: string; isCustom?: boolean; claimedByGuestName?: string }) => {
    const newGift: Gift = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: giftData.name,
      category: giftData.category,
      description: giftData.description || '',
      priceRange: giftData.priceRange || 'Até R$ 100',
      imageUrl: giftData.imageUrl || '',
      isClaimed: !!giftData.claimedByGuestName,
      claimedByGuestName: giftData.claimedByGuestName || '',
      isCustom: true
    };

    const updatedGifts = [...data.gifts, newGift];
    setData(prev => ({
      ...prev,
      gifts: updatedGifts
    }));

    const activeCoupleId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await updateCoupleGiftsInFirestore(activeCoupleId, updatedGifts);
    } else {
      await saveGiftToFirestore(newGift);
    }

    try {
      await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftData)
      });
    } catch (err) {
      console.warn('Server custom gift sync notice:', err);
    }

    showToast('Presente adicionado com sucesso!');
  };

  const handleSubmitRsvp = async (rsvpData: { name: string; email?: string; phone?: string; companions: number; status: 'confirmed' | 'declined'; message?: string }) => {
    const coupleKey = selectedCoupleId ? `cha_guest_rsvp_confirmed_${selectedCoupleId}` : null;
    if (rsvpData.status === 'confirmed') {
      localStorage.setItem('cha_guest_rsvp_confirmed', 'true');
      if (coupleKey) localStorage.setItem(coupleKey, 'true');
    } else {
      localStorage.removeItem('cha_guest_rsvp_confirmed');
      if (coupleKey) localStorage.removeItem(coupleKey);
    }

    // Auto-sync guestSession if not set
    if (!guestSession && rsvpData.name) {
      const session: GuestAuthSession = {
        name: rsvpData.name.trim(),
        email: rsvpData.email?.trim() || '',
        provider: 'email'
      };
      setGuestSession(session);
      try {
        localStorage.setItem('cha_guest_session', JSON.stringify(session));
        localStorage.setItem('cha_guest_name', session.name);
      } catch (err) {
        console.error(err);
      }
    }

    const cleanName = rsvpData.name.trim();
    const cleanEmail = rsvpData.email?.trim() || '';
    const cleanPhone = rsvpData.phone?.trim() || '';

    // Check if guest already exists
    const existingIndex = data.guests.findIndex(g => 
      (cleanPhone && g.phone && g.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) ||
      (cleanEmail && g.email && g.email.toLowerCase() === cleanEmail.toLowerCase()) ||
      g.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    let updatedGuests: Guest[];
    let targetGuest: Guest;

    if (existingIndex >= 0) {
      targetGuest = {
        ...data.guests[existingIndex],
        name: cleanName,
        email: cleanEmail || data.guests[existingIndex].email,
        phone: cleanPhone || data.guests[existingIndex].phone,
        companions: Number(rsvpData.companions) || 0,
        status: rsvpData.status,
        message: rsvpData.message?.trim() || data.guests[existingIndex].message,
        updatedAt: new Date().toISOString()
      };
      updatedGuests = [...data.guests];
      updatedGuests[existingIndex] = targetGuest;
    } else {
      targetGuest = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        companions: Number(rsvpData.companions) || 0,
        status: rsvpData.status,
        message: rsvpData.message?.trim() || '',
        updatedAt: new Date().toISOString()
      };
      updatedGuests = [...data.guests, targetGuest];
    }

    // Atualização otimista imediata na lista de convidados em tempo real
    setData(prev => ({
      ...prev,
      guests: updatedGuests
    }));

    const activeCoupleId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, data.gifts, updatedGuests);
    } else {
      await saveGuestToFirestore(targetGuest);
    }

    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvpData)
      });
    } catch (err) {
      console.warn('Server rsvp sync notice:', err);
    }

    if (rsvpData.status === 'confirmed') {
      localStorage.setItem('cha_guest_rsvp_confirmed', 'true');
      const session = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        authenticatedAt: new Date().toISOString()
      };
      setGuestSession(session);
      localStorage.setItem('cha_guest_session', JSON.stringify(session));
      showToast('🎉 Presença confirmada! A lista de presentes foi liberada!');
    } else {
      showToast('Resposta registrada. Sentiremos sua falta!');
    }
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
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    setData(prev => ({ ...prev, guests: [] }));
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, data.gifts, []);
    }
    try {
      await fetch('/api/clear-guests', { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    showToast('Lista de convidados zerada!');
  };

  const handleClearGifts = async () => {
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    setData(prev => ({ ...prev, gifts: [] }));
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, [], data.guests);
    }
    try {
      await fetch('/api/clear-gifts', { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    showToast('Lista de presentes zerada com sucesso!');
  };

  const handleImportTemplateGifts = async () => {
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    const templateGifts = initialData.gifts.map((g, idx) => ({
      ...g,
      id: `gift_tpl_${Date.now()}_${idx}`,
      isClaimed: false,
      claimedByGuestName: undefined,
      claimedByGuestEmail: undefined,
      claimedByGuestPhone: undefined,
      claimedAt: undefined
    }));
    const mergedGifts = [...data.gifts];
    for (const tg of templateGifts) {
      if (!mergedGifts.some(existing => existing.name.trim().toLowerCase() === tg.name.trim().toLowerCase())) {
        mergedGifts.push(tg);
      }
    }
    setData(prev => ({ ...prev, gifts: mergedGifts }));
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, mergedGifts, data.guests);
    }
    try {
      await fetch('/api/import-template-gifts', { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    showToast('Sugestões de presentes carregadas com sucesso!');
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
      suggestedUrl: giftData.suggestedUrl || '',
      imageUrl: giftData.imageUrl || '',
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

    // 1. Atualização instantânea em tempo real na interface (0ms)
    setData(prev => ({
      ...prev,
      gifts: updatedGifts
    }));

    // 2. Persiste em nuvem no Firestore
    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    } else {
      await saveGiftToFirestore(giftObj);
    }

    // 3. Sincroniza com servidor em segundo plano
    const method = giftData.id ? 'PUT' : 'POST';
    const url = giftData.id ? `/api/gifts/${giftData.id}` : '/api/gifts';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftObj)
      });
    } catch (err) {
      console.warn('Server gift sync notice:', err);
    }

    showToast('Presente salvo com sucesso!');
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este presente da lista?')) return;
    const updatedGifts = data.gifts.filter(g => g.id !== id);
    
    // Atualização imediata em tempo real na tela
    setData(prev => ({
      ...prev,
      gifts: updatedGifts
    }));

    const activeCoupleId = auth.currentUser?.uid || selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await saveCoupleToFirestore(activeCoupleId, data.eventInfo, updatedGifts, data.guests);
    } else {
      await deleteGiftFromFirestore(id);
    }

    try {
      await fetch(`/api/gifts/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Server delete gift sync notice:', err);
    }
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
          notes: undefined,
          claimedAt: undefined
        };
      }
      return g;
    });

    // 1. Atualização em tempo real instantânea na tela do convidado (0ms)
    setData(prev => ({
      ...prev,
      gifts: updatedGifts
    }));

    showToast('Presente liberado para a lista novamente!');

    // 2. Atualiza os presentes do casal existente no Firestore (NUNCA cria um casal novo)
    const activeCoupleId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (activeCoupleId) {
      await updateCoupleGiftsInFirestore(activeCoupleId, updatedGifts);
    } else {
      const targetGift = updatedGifts.find(g => g.id === id);
      if (targetGift) await saveGiftToFirestore(targetGift);
    }

    // 3. Sincroniza em segundo plano sem descarregar a página nem resetar estado
    try {
      await fetch(`/api/gifts/${id}/unclaim`, { method: 'POST' });
    } catch (err) {
      console.warn('Server unclaim sync notice:', err);
    }
  };

  const handleResetData = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao restaurar dados');
    await fetchData();
    showToast('Dados restaurados!');
  };

  const isSuperAdmin = Boolean(
    guestSession?.email?.toLowerCase() === 'euques@gmail.com' &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem('cha_superadmin_authenticated') === 'true'
  );

  const isCoupleAdmin = Boolean(
    typeof window !== 'undefined' &&
    (sessionStorage.getItem('cha_couple_authenticated') === 'true' ||
      (auth.currentUser && selectedCoupleId && auth.currentUser.uid === selectedCoupleId))
  );

  const isPresenceConfirmed = React.useMemo(() => {
    if (isSuperAdmin || isCoupleAdmin) return true;
    if (!guestSession) return false;

    const coupleKey = selectedCoupleId ? `cha_guest_rsvp_confirmed_${selectedCoupleId}` : null;
    if (coupleKey && localStorage.getItem(coupleKey) === 'true') {
      return true;
    }

    const sessionName = (guestSession.name || '').trim().toLowerCase();
    const sessionEmail = (guestSession.email || '').trim().toLowerCase();

    const foundInGuests = data.guests.find(g => {
      const matchName = g.name && g.name.trim().toLowerCase() === sessionName;
      const matchEmail = sessionEmail && g.email && g.email.trim().toLowerCase() === sessionEmail;
      return matchName || matchEmail;
    });

    if (foundInGuests) {
      return foundInGuests.status === 'confirmed';
    }

    // Se o convidado já possui algum presente reservado no evento, sua presença está confirmada
    const hasClaimedGift = Boolean(
      sessionName && data.gifts.some(g => g.isClaimed && g.claimedByGuestName?.trim().toLowerCase() === sessionName)
    );
    if (hasClaimedGift) {
      return true;
    }

    if (localStorage.getItem('cha_guest_rsvp_confirmed') === 'true') {
      return true;
    }

    return false;
  }, [guestSession, data.guests, data.gifts, selectedCoupleId, isSuperAdmin, isCoupleAdmin]);

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
        isPresenceConfirmed={isPresenceConfirmed}
      />

      {/* Main Content Area based on URL Route */}
      <main className="flex-1 w-full py-4 sm:py-8 px-2 sm:px-4 pb-8">
        {currentRoute === 'home' && (
          <LandingPage 
            couples={registeredCouples}
            onNavigate={navigate}
            onSelectCouple={(id) => {
              setSelectedCoupleId(id);
              localStorage.setItem('cha_selected_couple_id', id);
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
                localStorage.setItem('cha_selected_couple_id', id);
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
                localStorage.setItem('cha_selected_couple_id', id);
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
            isPresenceConfirmed={isPresenceConfirmed}
          />
        )}

        {currentRoute === 'presentes' && (
          <GiftsPage 
            gifts={data.gifts}
            guestSession={guestSession}
            isPresenceConfirmed={isPresenceConfirmed}
            isCoupleAdmin={isCoupleAdmin}
            isSuperAdmin={isSuperAdmin}
            eventInfo={data.eventInfo}
            guests={data.guests}
            onSubmitRsvp={handleSubmitRsvp}
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
              onLoadCouple={handleLoadCouple}
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
