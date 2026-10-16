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
import { formatEventDate, getCleanEventDisplayTitle } from './lib/formatters';
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
  const bride = (brideName || 'noiva').trim() || 'noiva';
  const groom = (groomName || 'noivo').trim() || 'noivo';
  return `${bride}-e-${groom}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const extractSlugFromPath = (pathname: string): string | null => {
  const match = pathname.toLowerCase().match(/\/(?:casal|evento)\/([a-z0-9-]+)/);
  if (match && match[1]) return match[1];
  const parts = pathname.toLowerCase().split('/').filter(Boolean);
  const slugPart = parts.find(p => p.includes('-e-'));
  return slugPart || null;
};

const getRouteFromPath = (path: string, search: string = typeof window !== 'undefined' ? window.location.search : ''): AppRoute => {
  const p = path.toLowerCase();
  if (p.includes('/superadmin') || p.includes('/euques')) return 'superadmin';
  if (p.includes('/presentes') || p.includes('/gifts')) return 'presentes';
  if (p.includes('/login') || p.includes('/entrar')) return 'login';
  if (p.includes('/noiva') || p.includes('/admin') || p.includes('/painel')) return 'noiva';
  if (p.includes('/casal') || p.includes('/evento') || p.includes('-e-')) return 'casal';

  if (search) {
    const params = new URLSearchParams(search);
    if (params.get('casal') || params.get('couple') || params.get('c')) {
      return 'casal';
    }
  }

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
      return '/casal/noivos';
    }
    case 'presentes': return '/presentes';
    case 'login': return '/login';
    case 'noiva': return '/noiva';
    case 'home':
    default: return '/';
  }
};

const isValidGuestSession = (session: GuestAuthSession | null | undefined): boolean => {
  if (!session) return false;
  const name = (session.name || '').trim();
  const email = (session.email || '').trim();
  if (!name || name === 'Convidado Firebase') return false;
  if (!email || !email.includes('@')) return false;
  return true;
};

export default function App() {
  const [data, setData] = useState<AppData>(initialData);
  const [registeredCouples, setRegisteredCouples] = useState<CoupleProfile[]>([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlCouple = urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c');
      if (urlCouple) {
        localStorage.setItem('cha_selected_couple_id', urlCouple);
        return urlCouple;
      }
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
    return getRouteFromPath(window.location.pathname, window.location.search);
  });

  // Guest Authentication Session State (strictly requires real login with email, never anonymous)
  const [guestSession, setGuestSession] = useState<GuestAuthSession | null>(() => {
    try {
      // Remove legacy global unauthenticated flags
      localStorage.removeItem('cha_guest_rsvp_confirmed');
      const saved = localStorage.getItem('cha_guest_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidGuestSession(parsed)) {
          return parsed;
        }
        localStorage.removeItem('cha_guest_session');
        localStorage.removeItem('cha_guest_name');
        localStorage.removeItem('cha_guest_unlocked');
      }
    } catch {
      return null;
    }
    return null;
  });

  // Listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const newRoute = getRouteFromPath(window.location.pathname, window.location.search);
      setCurrentRoute(newRoute);

      const urlParams = new URLSearchParams(window.location.search);
      const urlCoupleId = urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c');
      const pathSlug = extractSlugFromPath(window.location.pathname);
      const targetParam = urlCoupleId || pathSlug;

      if (targetParam && registeredCouples.length > 0) {
        const found = registeredCouples.find(
          c =>
            c.id === targetParam ||
            c.aliasIds?.includes(targetParam) ||
            getCoupleSlug(c.eventInfo?.brideName, c.eventInfo?.groomName) === targetParam.toLowerCase()
        );
        if (found) {
          setSelectedCoupleId(found.id);
          try {
            localStorage.setItem('cha_selected_couple_id', found.id);
          } catch {}
          setData({
            eventInfo: found.eventInfo,
            gifts: found.gifts || [],
            guests: found.guests || []
          });
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [registeredCouples]);

  // Dynamically keep OpenGraph (OG), Twitter Cards, and document title synced with the active couple
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const info = data.eventInfo;
    const isPlatformView = currentRoute === 'home' || currentRoute === 'superadmin';
    const bride = (info?.brideName || 'Noiva').trim();
    const groom = (info?.groomName || 'Noivo').trim();
    const rawTitle = (info?.eventTitle || 'Chá de Panela').trim();
    const cleanTitle = getCleanEventDisplayTitle(rawTitle, bride, groom);
    const slug = getCoupleSlug(bride, groom);
    const activeId = selectedCoupleId || (info?.id && info.id !== 'main' ? info.id : '');

    const title = isPlatformView
      ? 'Chá de Panela — Plataforma de Eventos, Convites e Lista de Presentes'
      : `${cleanTitle} | Convite & Lista de Presentes`;

    const dateFormatted = formatEventDate(info?.date);
    const datePart = dateFormatted && dateFormatted !== 'A definir' ? ` 📅 Data: ${dateFormatted}${info?.time ? ` às ${info.time}` : ''}.` : '';
    const locPart = info?.location ? ` 📍 Local: ${info.location}.` : '';
    const description = isPlatformView
      ? 'Painel completo para noivas organizarem o chá de panela, gerenciarem lista de convidados, confirmações (RSVP) e lista de presentes interativa para convidados.'
      : `Você foi convidado(a) para o ${cleanTitle}!${datePart}${locPart} Acesse o perfil do casal para confirmar sua presença e visualizar a lista de presentes.`;

    let ogImageUrl = 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80';
    if (!isPlatformView) {
      if (info?.coverImage && (info.coverImage.startsWith('http://') || info.coverImage.startsWith('https://'))) {
        ogImageUrl = info.coverImage;
      } else if (info?.coverImage && info.coverImage.startsWith('/uploads/')) {
        ogImageUrl = `${window.location.origin}${info.coverImage}`;
      } else if (activeId || slug) {
        ogImageUrl = `${window.location.origin}/api/og-image/${encodeURIComponent(activeId || slug)}.jpg`;
      }
    }

    const canonicalUrl = !isPlatformView && activeId
      ? `${window.location.origin}/casal/${slug}?casal=${encodeURIComponent(activeId)}`
      : window.location.href;

    document.title = title;

    const setMeta = (selector: string, attrName: 'property' | 'name', attrVal: string, content: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImageUrl);
    setMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', ogImageUrl);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', isPlatformView ? 'Chá de Panela' : cleanTitle);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImageUrl);

    // Keep URL normalized to /casal/<slug>?casal=<id> when viewing the couple's profile from a root /?casal=<id> invite link
    if (currentRoute === 'casal' && activeId && window.location.pathname === '/') {
      const normalizedPath = `/casal/${slug}?casal=${encodeURIComponent(activeId)}`;
      window.history.replaceState({}, '', normalizedPath);
    }
  }, [data.eventInfo, currentRoute, selectedCoupleId]);

  // Listen to Firebase Authentication state changes (ignore anonymous Firestore connections)
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous && firebaseUser.email) {
        const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
        const session: GuestAuthSession = {
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'Convidado',
          email: firebaseUser.email,
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

        // ONLY auto-load couple profile when on the couple admin route (/noiva) without an explicit couple URL override
        const isCoupleAuth = sessionStorage.getItem('cha_couple_authenticated') === 'true';
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlCouple = Boolean(urlParams.get('casal') || urlParams.get('couple') || urlParams.get('c') || extractSlugFromPath(window.location.pathname));
        const activeRoute = getRouteFromPath(window.location.pathname, window.location.search);
        if (isCoupleAuth && activeRoute === 'noiva' && !hasUrlCouple) {
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
      const pathSlug = extractSlugFromPath(window.location.pathname);
      const targetParam = urlCoupleId || pathSlug;

      let matched: CoupleProfile | undefined;
      if (targetParam) {
        matched = couplesList.find(
          c =>
            c.id === targetParam ||
            c.aliasIds?.includes(targetParam) ||
            getCoupleSlug(c.eventInfo?.brideName, c.eventInfo?.groomName) === targetParam.toLowerCase()
        );
      } else if (selectedCoupleId && window.location.pathname !== '/') {
        matched = couplesList.find(c => c.id === selectedCoupleId);
      }

      if (matched && matched.eventInfo) {
        if (matched.id && matched.id !== selectedCoupleId) {
          setSelectedCoupleId(matched.id);
          try {
            localStorage.setItem('cha_selected_couple_id', matched.id);
          } catch {}
        }
        setData({
          eventInfo: matched.eventInfo,
          gifts: matched.gifts || [],
          guests: matched.guests || []
        });
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

  const handleOpenCoupleFromLanding = (couple: CoupleProfile) => {
    const coupleId = couple.id;
    const slug = getCoupleSlug(couple.eventInfo?.brideName, couple.eventInfo?.groomName);
    const coupleUrl = `/casal/${slug}?casal=${encodeURIComponent(coupleId)}`;

    if (window.location.pathname + window.location.search !== coupleUrl) {
      window.history.pushState({}, '', coupleUrl);
    }

    setSelectedCoupleId(coupleId);
    try {
      localStorage.setItem('cha_selected_couple_id', coupleId);
    } catch {}

    setData({
      eventInfo: couple.eventInfo,
      gifts: couple.gifts || [],
      guests: couple.guests || []
    });

    setCurrentRoute('casal');
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
    const prevEmail = guestSession?.email?.trim().toLowerCase();
    const prevName = guestSession?.name?.trim().toLowerCase();
    setGuestSession(null);
    try {
      localStorage.removeItem('cha_guest_session');
      localStorage.removeItem('cha_guest_name');
      localStorage.removeItem('cha_guest_unlocked');
      localStorage.removeItem('cha_guest_rsvp_confirmed');
      if (selectedCoupleId) {
        localStorage.removeItem(`cha_guest_rsvp_confirmed_${selectedCoupleId}`);
        if (prevEmail) localStorage.removeItem(`cha_rsvp_confirmed_${selectedCoupleId}_${prevEmail}`);
        if (prevName) localStorage.removeItem(`cha_rsvp_confirmed_${selectedCoupleId}_${prevName}`);
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
      const activeRoute = getRouteFromPath(window.location.pathname, window.location.search);
      const isCouple =
        activeRoute === 'noiva' &&
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

      // If a specific couple is requested via URL parameter, slug in pathname, or selection
      const pathSlug = extractSlugFromPath(window.location.pathname);
      const targetCoupleId =
        urlCoupleId ||
        pathSlug ||
        selectedCoupleId ||
        (typeof window !== 'undefined' ? localStorage.getItem('cha_selected_couple_id') : null);

      if (targetCoupleId) {
        let found = couplesList.find(
          c =>
            c.id === targetCoupleId ||
            c.aliasIds?.includes(targetCoupleId) ||
            getCoupleSlug(c.eventInfo?.brideName, c.eventInfo?.groomName) === targetCoupleId.toLowerCase()
        );
        if (!found) {
          try {
            const directRecord = await getCoupleFromFirestore(targetCoupleId);
            if (directRecord && directRecord.eventInfo) {
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
    const slug = getCoupleSlug(data.eventInfo?.brideName, data.eventInfo?.groomName);
    const activeId = selectedCoupleId || (data.eventInfo?.id && data.eventInfo.id !== 'main' ? data.eventInfo.id : '');
    const coupleProfileLink = activeId
      ? `${window.location.origin}/casal/${slug}?casal=${encodeURIComponent(activeId)}`
      : `${window.location.origin}/casal/${slug}`;
    navigator.clipboard.writeText(coupleProfileLink);
    setCopiedLink(true);
    showToast('Link do Perfil do Casal copiado!');
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
    const cleanName = rsvpData.name.trim();
    const cleanEmail = (rsvpData.email?.trim() || guestSession?.email?.trim() || '');
    const cleanPhone = rsvpData.phone?.trim() || '';
    const activeCoupleId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : 'default');
    const guestIdentity = (cleanEmail || cleanName).toLowerCase();
    const scopedRsvpKey = activeCoupleId && guestIdentity ? `cha_rsvp_confirmed_${activeCoupleId}_${guestIdentity}` : null;

    if (rsvpData.status === 'confirmed') {
      if (scopedRsvpKey) localStorage.setItem(scopedRsvpKey, 'true');
    } else {
      if (scopedRsvpKey) localStorage.removeItem(scopedRsvpKey);
    }

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

    const coupleIdForSave = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : null);
    if (coupleIdForSave) {
      await saveCoupleToFirestore(coupleIdForSave, data.eventInfo, data.gifts, updatedGuests);
    } else {
      await saveGuestToFirestore(targetGuest);
    }

    try {
      await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rsvpData, email: cleanEmail })
      });
    } catch (err) {
      console.warn('Server rsvp sync notice:', err);
    }

    if (rsvpData.status === 'confirmed') {
      if (guestSession && isValidGuestSession(guestSession)) {
        const updatedSession: GuestAuthSession = {
          ...guestSession,
          name: cleanName || guestSession.name,
          email: cleanEmail || guestSession.email,
          phone: cleanPhone || guestSession.phone,
          authenticatedAt: new Date().toISOString()
        };
        setGuestSession(updatedSession);
        localStorage.setItem('cha_guest_session', JSON.stringify(updatedSession));
      }
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
    sessionStorage.getItem('cha_couple_authenticated') === 'true' &&
    auth.currentUser &&
    !auth.currentUser.isAnonymous &&
    (!selectedCoupleId || auth.currentUser.uid === selectedCoupleId || data.eventInfo?.id === auth.currentUser.uid)
  );

  const isGuestLoggedIn = isValidGuestSession(guestSession);

  const isPresenceConfirmed = React.useMemo(() => {
    if (isSuperAdmin || isCoupleAdmin) return true;
    if (!isGuestLoggedIn || !guestSession) return false;

    const sessionName = (guestSession.name || '').trim().toLowerCase();
    const sessionEmail = (guestSession.email || '').trim().toLowerCase();

    const foundInGuests = data.guests.find(g => {
      const matchEmail = sessionEmail && g.email && g.email.trim().toLowerCase() === sessionEmail;
      const matchName = sessionName && g.name && g.name.trim().toLowerCase() === sessionName;
      return matchEmail || matchName;
    });

    if (foundInGuests) {
      return foundInGuests.status === 'confirmed';
    }

    const activeId = selectedCoupleId || (data.eventInfo && data.eventInfo.id !== 'main' ? data.eventInfo.id : 'default');
    if (activeId) {
      if (sessionEmail && localStorage.getItem(`cha_rsvp_confirmed_${activeId}_${sessionEmail}`) === 'true') {
        return true;
      }
      if (sessionName && localStorage.getItem(`cha_rsvp_confirmed_${activeId}_${sessionName}`) === 'true') {
        return true;
      }
    }

    // Se este convidado logado já reservou algum presente neste evento, sua presença está confirmada
    const hasClaimedGift = Boolean(
      data.gifts.some(g =>
        g.isClaimed &&
        ((sessionEmail && g.claimedByGuestEmail?.trim().toLowerCase() === sessionEmail) ||
         (sessionName && g.claimedByGuestName?.trim().toLowerCase() === sessionName))
      )
    );
    if (hasClaimedGift) {
      return true;
    }

    return false;
  }, [isGuestLoggedIn, guestSession, data.guests, data.gifts, selectedCoupleId, data.eventInfo?.id, isSuperAdmin, isCoupleAdmin]);

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
        guestSession={isGuestLoggedIn ? guestSession : null}
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
            onSelectCouple={handleOpenCoupleFromLanding}
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
                  const slug = getCoupleSlug(found.eventInfo?.brideName, found.eventInfo?.groomName);
                  const coupleUrl = `/casal/${slug}?casal=${encodeURIComponent(id)}`;
                  window.history.pushState({}, '', coupleUrl);
                }
              }}
            />
          ) : (
            <LandingPage 
              couples={registeredCouples}
              onNavigate={navigate}
              onSelectCouple={handleOpenCoupleFromLanding}
            />
          )
        )}

        {currentRoute === 'casal' && (
          <HomePage 
            eventInfo={data.eventInfo}
            guests={data.guests}
            guestSession={isGuestLoggedIn ? guestSession : null}
            onSubmitRsvp={handleSubmitRsvp}
            onNavigate={navigate}
            availableGiftsCount={availableGiftsCount}
            isPresenceConfirmed={isPresenceConfirmed}
          />
        )}

        {currentRoute === 'presentes' && (
          <GiftsPage 
            gifts={data.gifts}
            guestSession={isGuestLoggedIn ? guestSession : null}
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
            guestSession={isGuestLoggedIn ? guestSession : null}
            isPresenceConfirmed={isPresenceConfirmed}
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
        <footer className="no-print py-8 text-center text-[#2D2D2D]/50 text-xs border-t border-[#E5DFD5]/60 bg-white/50 space-y-2.5">
          <div className="flex items-center justify-center space-x-1.5 font-serif text-base font-bold text-[#2D2D2D]">
            <span>{data.eventInfo.brideName}</span>
            <Heart className="w-3.5 h-3.5 text-[#C5A059] fill-current" />
            <span>{data.eventInfo.groomName}</span>
          </div>
          <p className="text-[11px] font-sans text-[#2D2D2D]/60">Chá de Panela • Lista de Presentes & Confirmação de Presença</p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#F2ECE4] border border-[#E5DFD5] text-[11px] font-bold text-[#2D2D2D]/80 hover:text-[#C5A059] transition cursor-pointer shadow-2xs"
            >
              <Home className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Ir para a Home (Todos os Casais)</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
