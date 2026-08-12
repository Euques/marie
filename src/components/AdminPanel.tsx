import React, { useState, useMemo, useEffect } from 'react';
import { EventInfo, Gift, GiftCategory, Guest } from '../types';
import { GuestModal } from './GuestModal';
import { GiftModal } from './GiftModal';
import { GiftCatalogModal } from './GiftCatalogModal';
import { CouplePhotoUploader } from './CouplePhotoUploader';
import { firebaseConfig, testFirebaseConnection, authenticateBrideAdminWithFirebase, loginWithGoogle, saveAdminToFirestore, saveCoupleToFirestore, getCoupleFromFirestore, auth, subscribeToAuthChanges, syncAllToFirestore, signOut } from '../lib/firebase';
import { 
  Crown, Users, Gift as GiftIcon, CheckCircle2, Clock, XCircle, X,
  Plus, Edit, Trash2, Lock, Unlock, Settings, Share2, Printer, 
  RefreshCw, Search, Filter, Copy, Check, MessageSquare, Phone, 
  Sparkles, AlertCircle, Heart, ArrowRight, ArrowLeft, Database, ExternalLink, Terminal,
  Mail, Eye, EyeOff, Loader2, ShieldCheck, ChevronDown, ChevronUp, Menu
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
  onClearGuests?: () => Promise<void>;
  onClearGifts?: () => Promise<void>;
  onImportTemplateGifts?: () => Promise<void>;
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
  onResetData,
  onClearGuests,
  onClearGifts,
  onImportTemplateGifts
}) => {
  // Password auth
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (sessionStorage.getItem('cha_couple_authenticated') === 'true') return true;
      if (auth.currentUser && !auth.currentUser.isAnonymous && !!auth.currentUser.email) return true;
    } catch {
      return false;
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Auto-authenticate Admin Panel when Firebase user is logged in
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user && !user.isAnonymous && user.email) {
        if (sessionStorage.getItem('cha_couple_authenticated') === 'true' || window.location.pathname.includes('/noiva')) {
          setIsAuthenticated(true);
          sessionStorage.setItem('cha_couple_authenticated', 'true');
          setAdminEmail(user.email);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Admin Firebase Auth & Firestore state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'register'>('login');
  const [adminLoadingAuth, setAdminLoadingAuth] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guests' | 'gifts' | 'settings' | 'invite' | 'firebase'>('dashboard');

  const isSuperAdmin = (auth.currentUser?.email?.toLowerCase() === 'euques@gmail.com') ||
                       (sessionStorage.getItem('cha_superadmin_authenticated') === 'true') ||
                       (adminEmail?.toLowerCase() === 'euques@gmail.com');

  useEffect(() => {
    if (activeTab === 'firebase' && !isSuperAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isSuperAdmin]);

  // Firebase state
  const [firebaseStatus, setFirebaseStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [firebaseMessage, setFirebaseMessage] = useState('');

  // Modals & Drawers state
  const [selectedGuestForEdit, setSelectedGuestForEdit] = useState<Guest | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  const [selectedGiftForEdit, setSelectedGiftForEdit] = useState<Gift | null>(null);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  const [isCoupleDrawerOpen, setIsCoupleDrawerOpen] = useState(false);
  const [isMenuAccordionOpen, setIsMenuAccordionOpen] = useState(false);

  // Filters
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');
  const [expandedGuestIds, setExpandedGuestIds] = useState<Record<string, boolean>>({});

  const toggleGuestAccordion = (id: string) => {
    setExpandedGuestIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Firebase Admin Auth Handlers
  const handleAdminFirebaseAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) {
      setAuthError('Por favor, informe o e-mail de acesso do casal.');
      return;
    }
    if (!adminPassword.trim() || adminPassword.length < 6) {
      setAuthError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setAuthError('');
    setAdminLoadingAuth(true);

    try {
      const user = await authenticateBrideAdminWithFirebase(adminEmail.trim(), adminPassword.trim(), adminAuthMode);
      
      const existingCouple = await getCoupleFromFirestore(user.uid);
      if (existingCouple && existingCouple.eventInfo) {
        await onUpdateEventInfo(existingCouple.eventInfo);
      } else {
        const brideDefault = user.displayName?.split(' ')[0] || adminEmail.trim().split('@')[0] || '';
        const newEventInfo: EventInfo = {
          id: user.uid,
          brideName: brideDefault,
          groomName: '',
          eventTitle: brideDefault ? `Chá de Panela de ${brideDefault}` : '',
          date: '',
          time: '',
          location: '',
          description: '',
          coverImage: '',
          pixKey: '',
          pixName: user.displayName || ''
        };
        const newGifts: Gift[] = [];
        const newGuests: Guest[] = [];

        await saveCoupleToFirestore(user.uid, newEventInfo, newGifts, newGuests);
        await onUpdateEventInfo(newEventInfo);
      }

      sessionStorage.setItem('cha_couple_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setAuthError(err.message || 'Erro ao realizar login. Verifique seus dados.');
    } finally {
      setAdminLoadingAuth(false);
    }
  };

  const handleAdminGoogleAuth = async () => {
    setAuthError('');
    setAdminLoadingAuth(true);
    try {
      const user = await loginWithGoogle();
      await saveAdminToFirestore(user, 'bride_admin');
      
      const existingCouple = await getCoupleFromFirestore(user.uid);
      if (existingCouple && existingCouple.eventInfo) {
        await onUpdateEventInfo(existingCouple.eventInfo);
      } else {
        const brideDefault = user.displayName?.split(' ')[0] || user.email?.split('@')[0] || '';
        const newEventInfo: EventInfo = {
          id: user.uid,
          brideName: brideDefault,
          groomName: '',
          eventTitle: brideDefault ? `Chá de Panela de ${brideDefault}` : '',
          date: '',
          time: '',
          location: '',
          description: '',
          coverImage: '',
          pixKey: '',
          pixName: user.displayName || ''
        };
        const newGifts: Gift[] = [];
        const newGuests: Guest[] = [];

        await saveCoupleToFirestore(user.uid, newEventInfo, newGifts, newGuests);
        await onUpdateEventInfo(newEventInfo);
      }

      sessionStorage.setItem('cha_couple_authenticated', 'true');
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Google Admin Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Login com Google cancelado.');
      } else {
        setAuthError('Erro na autenticação do Google. Tente com E-mail e Senha abaixo.');
      }
    } finally {
      setAdminLoadingAuth(false);
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
    const coupleId = eventInfo.id || auth.currentUser?.uid || '';
    const link = coupleId ? `${window.location.origin}/?casal=${coupleId}` : window.location.origin;
    const nameStr = guestName ? `Olá, ${guestName}! ` : '';
    const brideGroom = eventInfo.brideName ? `${eventInfo.brideName}${eventInfo.groomName ? ` & ${eventInfo.groomName}` : ''}` : 'Noivos';
    return `*Convite Especial de Chá de Panela* 🎉\n\n${nameStr}Você está convidado(a) para o *${eventInfo.eventTitle || 'Chá de Panela'}* de *${brideGroom}*!\n\n📅 *Data:* ${eventInfo.date || 'A definir'}\n⏰ *Horário:* ${eventInfo.time || 'A definir'}\n📍 *Local:* ${eventInfo.location || 'A definir'}\n\nAcesse nosso site exclusivo para confirmar sua presença e escolher um presente da lista:\n👉 ${link}`;
  };

  const handleCopyWhatsAppInvite = (guestName?: string) => {
    const msg = getWhatsAppMessage(guestName);
    navigator.clipboard.writeText(msg);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  // Lock Password Screen with clean, airy layout and mobile-optimized tabs
  const [adminTabMode, setAdminTabMode] = useState<'email' | 'google'>('email');

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-6 sm:py-8 px-3 sm:px-4 animate-fade-in">
        <div className="max-w-md w-full mx-auto space-y-6 text-center">
          
          {/* Header */}
          <div className="space-y-3">
            <div className="w-16 h-16 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-[#E5DFD5]">
              <Crown className="w-8 h-8 text-[#C5A059]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D2D2D] tracking-tight">
                Painel do <span className="text-[#C5A059]">Casal</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#2D2D2D]/70 font-medium max-w-xs mx-auto">
                Área restrita de gerenciamento para os noivos
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 text-xs bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-left font-semibold">
              {authError}
            </div>
          )}

          {/* LOGIN METHOD TAB SELECTOR */}
          <div className="flex bg-[#FAF9F6] p-1.5 rounded-2xl border border-[#E5DFD5]">
            <button
              type="button"
              onClick={() => { setAdminTabMode('email'); setAuthError(''); }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer ${
                adminTabMode === 'email' 
                  ? 'bg-white text-[#2D2D2D] shadow-sm border border-[#E5DFD5]' 
                  : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
              }`}
            >
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>E-mail e Senha</span>
            </button>

            <button
              type="button"
              onClick={() => { setAdminTabMode('google'); setAuthError(''); }}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer ${
                adminTabMode === 'google' 
                  ? 'bg-white text-[#2D2D2D] shadow-sm border border-[#E5DFD5]' 
                  : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
              </svg>
              <span>Google</span>
            </button>
          </div>

          {/* TAB 1: EMAIL & PASSWORD FORM */}
          {adminTabMode === 'email' && (
            <form onSubmit={handleAdminFirebaseAuthSubmit} className="space-y-4 text-left bg-white p-5 rounded-2xl border border-[#E5DFD5] shadow-xs animate-fade-in">
              <div className="flex items-center justify-between bg-[#FAF9F6] p-1 rounded-xl border border-[#E5DFD5] text-[11px] font-extrabold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setAdminAuthMode('login')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    adminAuthMode === 'login' ? 'bg-[#2D2D2D] text-white shadow-2xs' : 'text-[#2D2D2D]/70'
                  }`}
                >
                  Entrar (Login)
                </button>
                <button
                  type="button"
                  onClick={() => setAdminAuthMode('register')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                    adminAuthMode === 'register' ? 'bg-[#C5A059] text-white shadow-2xs' : 'text-[#2D2D2D]/70'
                  }`}
                >
                  Criar Conta do Casal
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                  E-mail do Casal <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="casal@exemplo.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D2D2D]/80">
                  Senha <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E5DFD5] bg-[#FAF9F6] text-sm text-[#2D2D2D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-1"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoadingAuth}
                className="w-full py-3.5 px-5 bg-[#2D2D2D] hover:bg-black text-white text-xs font-extrabold uppercase tracking-widest rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[48px] cursor-pointer active:scale-95"
              >
                {adminLoadingAuth ? (
                  <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                    <span>{adminAuthMode === 'login' ? 'Entrar no Painel do Casal' : 'Cadastrar e Acessar Painel'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: GOOGLE AUTH BUTTON */}
          {adminTabMode === 'google' && (
            <div className="space-y-3 animate-fade-in">
              <button
                type="button"
                disabled={adminLoadingAuth}
                onClick={handleAdminGoogleAuth}
                className="w-full py-4 px-5 bg-white hover:bg-[#FAF9F6] active:scale-95 text-[#2D2D2D] font-extrabold text-sm rounded-2xl border-2 border-[#C5A059] shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50 cursor-pointer min-h-[52px] group"
              >
                {adminLoadingAuth ? (
                  <Loader2 className="w-6 h-6 text-[#C5A059] animate-spin" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white p-1 border border-[#E5DFD5] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.28v3.15C3.25 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.28C.46 8.23 0 10.06 0 12s.46 3.77 1.28 5.39l4-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.28 6.61l4 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                    </svg>
                  </div>
                )}
                <span className="tracking-wide">Entrar com a Conta Google</span>
              </button>
              <p className="text-[11px] text-[#2D2D2D]/60 font-medium">
                Autenticação simples e direta vinculada à sua conta Google
              </p>
            </div>
          )}

        </div>
      </div>
    );
  }

  const handleCoupleLogout = async () => {
    try {
      sessionStorage.removeItem('cha_couple_authenticated');
      setIsAuthenticated(false);
      await signOut(auth);
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* CARD DE IDENTIFICAÇÃO DO USUÁRIO LOGADO / NOIVA */}
      <div className="no-print bg-white rounded-3xl p-5 sm:p-6 border border-[#E5DFD5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          {/* Esquerda: Avatar, Nome e E-mail */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#2D2D2D] text-[#C5A059] font-serif font-bold text-xl flex items-center justify-center shrink-0 shadow-xs border border-[#C5A059]/30">
              {(auth.currentUser?.displayName || eventInfo.brideName || adminEmail || 'N').charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#2D2D2D] truncate">
                  {auth.currentUser?.displayName || (eventInfo.brideName ? `${eventInfo.brideName}${eventInfo.groomName ? ` & ${eventInfo.groomName}` : ''}` : 'Painel do Casal')}
                </h3>

                {isSuperAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                    👑 Super Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] shrink-0">
                    💍 Conta do Casal
                  </span>
                )}
              </div>

              <p className="text-xs text-[#2D2D2D]/70 font-sans truncate flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                <span className="truncate">{auth.currentUser?.email || adminEmail || 'E-mail não informado'}</span>
              </p>
            </div>
          </div>

          {/* Direita: Status do Usuário & Ações */}
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-start sm:justify-end">
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: Conectado</span>
            </div>

            <button
              onClick={() => setIsCoupleDrawerOpen(true)}
              className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer active:scale-95 shadow-2xs"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Noivos</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-[#FAF9F6] hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleCoupleLogout}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/80 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Link Exclusivo do Casal para os Convidados */}
        <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5DFD5] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 min-w-0 w-full sm:w-auto">
            <Share2 className="w-4 h-4 text-[#C5A059] shrink-0" />
            <span className="font-bold text-[#2D2D2D] shrink-0">Link Único para Convidados:</span>
            <span className="font-mono text-[11px] text-[#2D2D2D]/70 truncate bg-white px-2.5 py-1 rounded-lg border border-[#E5DFD5] w-full sm:w-auto">
              {`${window.location.origin}/?casal=${eventInfo.id || auth.currentUser?.uid || ''}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/?casal=${eventInfo.id || auth.currentUser?.uid || ''}`;
              navigator.clipboard.writeText(url);
              alert('Link exclusivo do casal copiado! Envie aos convidados para que vejam apenas a sua lista.');
            }}
            className="px-3.5 py-1.5 bg-[#2D2D2D] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 w-full sm:w-auto text-center shadow-2xs active:scale-95"
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* MENU NAVEGAÇÃO DO PAINEL DO CASAL (DROPDOWN / ACCORDION RETRÁTIL) */}
      <div className="no-print bg-white border border-[#E5DFD5] rounded-3xl p-3 sm:p-4 shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsMenuAccordionOpen(!isMenuAccordionOpen)}
          className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-[#FAF9F6] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 bg-[#2D2D2D] text-[#C5A059] rounded-2xl shrink-0 shadow-xs">
              <Menu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C5A059]">
                  Menu de Navegação do Casal
                </span>
                <span className="text-[9px] font-bold text-[#2D2D2D]/60 bg-[#F2ECE4] px-2 py-0.5 rounded-full">
                  {isSuperAdmin ? '6 Seções' : '5 Seções'}
                </span>
              </div>
              <p className="text-sm sm:text-base font-serif font-bold text-[#2D2D2D] truncate mt-0.5">
                {activeTab === 'dashboard' && '1. Visão Geral & Resumo das Confirmações'}
                {activeTab === 'settings' && '2. Configurações dos Noivos, Foto & Local'}
                {activeTab === 'guests' && `3. Gerenciamento de Convidados (${guests.length})`}
                {activeTab === 'gifts' && `4. Gestão & Sugestões de Presentes (${claimedGifts.length}/${gifts.length})`}
                {activeTab === 'invite' && '5. Enviar Convites WhatsApp'}
                {activeTab === 'firebase' && '6. Banco em Nuvem (Firebase)'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pl-2 shrink-0">
            <span className="hidden sm:inline-block text-xs font-bold text-[#C5A059] bg-[#F2ECE4] px-3 py-1.5 rounded-xl">
              {isMenuAccordionOpen ? 'Fechar Menu' : 'Abrir Menu'}
            </span>
            <div className="p-2 bg-[#F2ECE4] text-[#2D2D2D] rounded-xl hover:bg-[#C5A059] hover:text-white transition-colors">
              {isMenuAccordionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </button>

        {isMenuAccordionOpen && (
          <div className="mt-3 pt-3 border-t border-[#E5DFD5] flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={() => { setActiveTab('dashboard'); setIsMenuAccordionOpen(false); }}
              className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                  : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                  <Crown className="w-4 h-4" />
                </div>
                <span className="font-serif normal-case text-sm font-bold tracking-normal">Visão Geral & Resumo das Confirmações</span>
              </div>
              <span className="text-[10px] opacity-75 font-sans uppercase">Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('settings'); setIsMenuAccordionOpen(false); }}
              className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                  : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'settings' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <span className="font-serif normal-case text-sm font-bold tracking-normal">Configurações dos Noivos, Foto & Local</span>
              </div>
              <span className="text-[10px] opacity-75 font-sans uppercase">Configurações</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('guests'); setIsMenuAccordionOpen(false); }}
              className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'guests'
                  ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                  : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'guests' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-serif normal-case text-sm font-bold tracking-normal">Gerenciamento de Convidados</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C5A059]/20 text-[#C5A059]">
                {guests.length} Convidados
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('gifts'); setIsMenuAccordionOpen(false); }}
              className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'gifts'
                  ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                  : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'gifts' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                  <GiftIcon className="w-4 h-4" />
                </div>
                <span className="font-serif normal-case text-sm font-bold tracking-normal">Gestão & Sugestões de Presentes</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#C5A059]/20 text-[#C5A059]">
                {claimedGifts.length} / {gifts.length} Reservados
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('invite'); setIsMenuAccordionOpen(false); }}
              className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 'invite'
                  ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                  : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${activeTab === 'invite' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="font-serif normal-case text-sm font-bold tracking-normal">Enviar Convites WhatsApp</span>
              </div>
              <span className="text-[10px] opacity-75 font-sans uppercase">Compartilhar</span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => { setActiveTab('firebase'); setIsMenuAccordionOpen(false); }}
                className={`w-full px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'firebase'
                    ? 'bg-[#2D2D2D] text-white shadow-sm ring-2 ring-[#C5A059]/40'
                    : 'bg-[#FAF9F6] text-[#2D2D2D] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${activeTab === 'firebase' ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="font-serif normal-case text-sm font-bold tracking-normal">Banco em Nuvem (Firebase)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Conectado
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: DASHBOARD / VISÃO CONSOLIDADA */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 mt-6">
          {/* Metrics Grid - App Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Confirmed People */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-3 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D2D2D]/60">Pessoas Confirmadas</span>
                <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-2xl shadow-2xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold font-serif text-[#2D2D2D]">{totalConfirmedPeople}</span>
                <span className="text-xs text-[#2D2D2D]/60">
                  ({confirmedGuests.length} convidados + {totalCompanionsConfirmed} acomp.)
                </span>
              </div>
            </div>

            {/* Pending RSVPs */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-3 hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D2D2D]/60">Presenças Pendentes</span>
                <div className="p-2.5 bg-amber-100/80 text-amber-800 rounded-2xl shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold font-serif text-[#2D2D2D]">{pendingGuests.length}</span>
                <span className="text-xs text-[#2D2D2D]/60">aguardando resposta</span>
              </div>
            </div>

            {/* Gifts Claimed */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-3 hover:border-[#C5A059] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D2D2D]/60">Presentes Reservados</span>
                <div className="p-2.5 bg-[#F2ECE4] text-[#C5A059] rounded-2xl shadow-2xs">
                  <GiftIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold font-serif text-[#2D2D2D]">{claimedGifts.length}</span>
                <span className="text-xs text-[#2D2D2D]/60">de {gifts.length} ({claimedPercent}%)</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-[#F2ECE4] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#C5A059] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${claimedPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Declined */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-3 hover:border-stone-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2D2D2D]/60">Não Poderão Ir</span>
                <div className="p-2.5 bg-[#FAF9F6] text-[#2D2D2D]/60 rounded-2xl border border-[#E5DFD5] shadow-2xs">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold font-serif text-[#2D2D2D]">{declinedGuests.length}</span>
                <span className="text-xs text-[#2D2D2D]/60">recusas enviadas</span>
              </div>
            </div>
          </div>

          {/* Category Progress Breakdown & Guest Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gifts by Category */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-4">
              <h3 className="font-serif italic font-bold text-[#2D2D2D] text-lg">Progresso dos Presentes por Categoria</h3>
              <div className="space-y-3">
                {CATEGORIES.map(cat => {
                  const catGifts = gifts.filter(g => g.category === cat);
                  if (catGifts.length === 0) return null;
                  const catClaimed = catGifts.filter(g => g.isClaimed).length;
                  const pct = Math.round((catClaimed / catGifts.length) * 100);

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-[#2D2D2D]">
                        <span>{cat}</span>
                        <span className="text-[#C5A059] font-serif font-bold">{catClaimed} / {catGifts.length} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-[#F2ECE4] h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#C5A059] h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Messages from Guests */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5DFD5] shadow-xs space-y-4">
              <h3 className="font-serif italic font-bold text-[#2D2D2D] text-lg">Recadinhos dos Convidados</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {guests.filter(g => g.message).length === 0 ? (
                  <p className="text-xs text-[#2D2D2D]/50 italic">Nenhuma mensagem deixada ainda.</p>
                ) : (
                  guests.filter(g => g.message).map(g => (
                    <div key={g.id} className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5DFD5] space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#2D2D2D]">{g.name}</span>
                        <span className="text-[10px] text-[#2D2D2D]/40">
                          {new Date(g.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-[#2D2D2D]/80 italic">"{g.message}"</p>
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
        <div className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2D2D2D]">Gerenciamento de Convidados</h2>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">Acompanhe as confirmações de presença e acompanhantes</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {guests.length > 0 && onClearGuests && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Deseja realmente ZERAR a lista de convidados? Todos os convidados e confirmações do evento atual serão removidos.')) {
                      await onClearGuests();
                    }
                  }}
                  className="px-4 py-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 active:scale-95 font-bold text-[10px] uppercase tracking-wider rounded-2xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Zerar Lista ({guests.length})</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedGuestForEdit(null);
                  setIsGuestModalOpen(true);
                }}
                className="px-5 py-3 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#C5A059]" />
                <span>Adicionar Convidado</span>
              </button>
            </div>
          </div>

          {/* Search & Filter bar */}
          <div className="bg-white p-5 rounded-3xl border border-[#E5DFD5] shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-4 top-3.5" />
              <input 
                type="text"
                placeholder="Buscar convidado por nome, telefone ou e-mail..."
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <select
              value={guestStatusFilter}
              onChange={e => setGuestStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 text-xs font-semibold border border-[#E5DFD5] rounded-2xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
            >
              <option value="all">Todos os Status</option>
              <option value="confirmed">🟢 Confirmados</option>
              <option value="pending">🟡 Pendentes</option>
              <option value="declined">🔴 Recusados</option>
            </select>
          </div>

          {/* Guests List as Compact Accordions */}
          <div className="space-y-3">
            {filteredGuests.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-[#E5DFD5] text-center text-[#2D2D2D]/50 italic">
                Nenhum convidado encontrado.
              </div>
            ) : (
              filteredGuests.map(guest => {
                const isExpanded = expandedGuestIds[guest.id] ?? false;

                return (
                  <div 
                    key={guest.id}
                    className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                      isExpanded ? 'border-[#C5A059] ring-1 ring-[#C5A059]/30' : 'border-[#E5DFD5] hover:border-[#C5A059]/60'
                    }`}
                  >
                    {/* ACCORDION HEADER */}
                    <button
                      type="button"
                      onClick={() => toggleGuestAccordion(guest.id)}
                      className="w-full p-4 flex flex-wrap sm:flex-nowrap items-center justify-between text-left hover:bg-[#FAF9F6] transition cursor-pointer gap-2"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#E5DFD5] flex items-center justify-center font-bold text-sm text-[#2D2D2D] shrink-0 shadow-2xs">
                          {guest.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h4 className="font-bold text-base text-[#2D2D2D] truncate">
                              {guest.name}
                            </h4>

                            {/* Status Badge */}
                            {guest.status === 'confirmed' && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Confirmado</span>
                              </span>
                            )}
                            {guest.status === 'pending' && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pendente</span>
                              </span>
                            )}
                            {guest.status === 'declined' && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                                <XCircle className="w-3 h-3 text-stone-500" />
                                <span>Recusado</span>
                              </span>
                            )}

                            {/* Companions Badge */}
                            {guest.companions > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F2ECE4] text-[#2D2D2D]/80 border border-[#E5DFD5]">
                                +{guest.companions} acomp.
                              </span>
                            )}
                          </div>

                          {(guest.phone || guest.email) && (
                            <p className="text-xs text-[#2D2D2D]/60 font-mono truncate">
                              {guest.phone || guest.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] hidden sm:inline">
                          {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E5DFD5] flex items-center justify-center text-[#C5A059]">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {/* ACCORDION EXPANDED CONTENT */}
                    {isExpanded && (
                      <div className="p-4 pt-3 border-t border-[#E5DFD5] bg-[#FAF9F6]/60 space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-[#E5DFD5]">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#2D2D2D]/50 block">Status da Presença</span>
                            <p className="font-semibold text-[#2D2D2D] mt-0.5">
                              {guest.status === 'confirmed' ? '🟢 Presença Confirmada' : guest.status === 'pending' ? '🟡 Aguardando Resposta' : '🔴 Não Poderá Comparecer'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#2D2D2D]/50 block">Acompanhantes</span>
                            <p className="font-semibold text-[#2D2D2D] mt-0.5">
                              {guest.companions > 0 ? `${guest.companions} acompanhante(s) confirmado(s)` : 'Nenhum acompanhante'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#2D2D2D]/50 block">Telefone / WhatsApp</span>
                            <p className="font-mono text-[#2D2D2D] mt-0.5">
                              {guest.phone || 'Não informado'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase text-[#2D2D2D]/50 block">E-mail</span>
                            <p className="font-mono text-[#2D2D2D] mt-0.5">
                              {guest.email || 'Não informado'}
                            </p>
                          </div>
                        </div>

                        {guest.message && (
                          <div className="bg-white p-3.5 rounded-xl border border-[#E5DFD5] space-y-1">
                            <span className="text-[10px] font-bold uppercase text-[#2D2D2D]/50 block">Mensagem do Convidado:</span>
                            <p className="italic text-[#2D2D2D]/80 leading-relaxed">
                              "{guest.message}"
                            </p>
                          </div>
                        )}

                        {/* ACTION BUTTONS */}
                        <div className="pt-2 border-t border-[#E5DFD5] flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyWhatsAppInvite(guest.name)}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition border border-emerald-200 flex items-center space-x-1.5 active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Enviar Convite WhatsApp</span>
                          </button>

                          <div className="flex items-center space-x-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuestForEdit(guest);
                                setIsGuestModalOpen(true);
                              }}
                              className="px-3.5 py-2 bg-white hover:bg-[#F2ECE4] text-[#2D2D2D] font-bold text-xs rounded-xl transition border border-[#E5DFD5] flex items-center space-x-1.5 active:scale-95"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteGuest(guest.id)}
                              className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl transition border border-rose-200 flex items-center space-x-1.5 active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GIFTS MANAGEMENT */}
      {activeTab === 'gifts' && (
        <div className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2D2D2D]">Gestão de Presentes</h2>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">Cadastre itens, edite preferências ou libere presentes escolhidos ({gifts.length} itens na lista)</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2.5 bg-[#C5A059] hover:bg-[#B38F48] text-white font-bold text-[10px] uppercase tracking-[0.15em] rounded-2xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Escolher das Sugestões</span>
              </button>

              {onClearGifts && gifts.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja apagar TODOS os presentes da lista?')) {
                      onClearGifts();
                    }
                  }}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider rounded-2xl border border-rose-200 transition flex items-center space-x-1 cursor-pointer active:scale-95"
                  title="Limpar todos os presentes da lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zerar Lista</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedGiftForEdit(null);
                  setIsGiftModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-[10px] uppercase tracking-[0.15em] rounded-2xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#C5A059]" />
                <span>Novo Presente</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="bg-white p-5 rounded-3xl border border-[#E5DFD5] shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-4 top-3.5" />
              <input 
                type="text"
                placeholder="Buscar presente ou nome do convidado..."
                value={giftSearch}
                onChange={e => setGiftSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <select
              value={giftCategoryFilter}
              onChange={e => setGiftCategoryFilter(e.target.value)}
              className="px-4 py-2.5 text-xs font-semibold border border-[#E5DFD5] rounded-2xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
            >
              <option value="Todas">Todas as Categorias</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={giftStatusFilter}
              onChange={e => setGiftStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 text-xs font-semibold border border-[#E5DFD5] rounded-2xl focus:border-[#C5A059] outline-none transition bg-[#FAF9F6] text-[#2D2D2D]"
            >
              <option value="all">Todos os Status</option>
              <option value="claimed">🔒 Reservados</option>
              <option value="available">🟢 Disponíveis</option>
            </select>
          </div>

          {/* Gifts Table */}
          <div className="bg-white rounded-3xl border border-[#E5DFD5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] text-[#2D2D2D] font-bold text-[10px] uppercase tracking-[0.2em] border-b border-[#E5DFD5]">
                  <tr>
                    <th className="p-4">Item</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Quem Escolheu</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5] text-[#2D2D2D]">
                  {filteredGifts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 bg-[#F2ECE4] text-[#C5A059] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                            <GiftIcon className="w-6 h-6" />
                          </div>
                          <h4 className="font-serif italic font-bold text-lg text-[#2D2D2D]">Sua lista de presentes está vazia</h4>
                          <p className="text-xs text-[#2D2D2D]/60 font-sans leading-relaxed">
                            Você pode abrir o catálogo e escolher individualmente os presentes desejados ou cadastrar um item personalizado.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              onClick={() => setIsCatalogModalOpen(true)}
                              className="px-4 py-2.5 bg-[#2D2D2D] hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                              <span>Abrir Catálogo de Sugestões</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedGiftForEdit(null);
                                setIsGiftModalOpen(true);
                              }}
                              className="px-4 py-2.5 bg-[#F2ECE4] hover:bg-[#E5DFD5] text-[#2D2D2D] font-bold text-[10px] uppercase tracking-wider rounded-xl border border-[#E5DFD5] transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                              <span>Novo Presente Manual</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGifts.map(gift => (
                      <tr key={gift.id} className="hover:bg-[#FAF9F6] transition">
                        <td className="p-4 font-semibold text-[#2D2D2D]">
                          <div>{gift.name}</div>
                          {gift.description && (
                            <div className="text-[11px] text-[#2D2D2D]/60 font-normal">{gift.description}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF9F6] text-[#2D2D2D] border border-[#E5DFD5]">
                            {gift.category}
                          </span>
                        </td>
                        <td className="p-4">
                          {gift.isClaimed ? (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                              🔒 Reservado
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🟢 Disponível
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-medium">
                          {gift.isClaimed ? (
                            <div>
                              <span className="font-bold text-[#2D2D2D]">{gift.claimedByGuestName || 'Convidado'}</span>
                              {gift.claimedByGuestPhone && (
                                <span className="block text-[10px] text-[#2D2D2D]/40 font-mono">{gift.claimedByGuestPhone}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#2D2D2D]/40 italic">Disponível</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1">
                          {gift.isClaimed && (
                            <button
                              onClick={() => onUnclaimGift(gift.id)}
                              title="Liberar / Desmarcar Presente"
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition border border-amber-200"
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
                            className="p-2 text-[#2D2D2D] hover:bg-[#F2ECE4] rounded-xl transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteGift(gift.id)}
                            title="Excluir Presente"
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DFD5] shadow-xs max-w-2xl mx-auto space-y-6 mt-6">
          <div className="space-y-2 text-center">
            <div className="p-3 bg-[#F2ECE4] text-[#C5A059] rounded-2xl w-fit mx-auto shadow-2xs">
              <Share2 className="w-6 h-6" />
            </div>
            <h2 className="font-serif italic text-2xl font-bold text-[#2D2D2D]">Gerador de Convite para WhatsApp</h2>
            <p className="text-xs text-[#2D2D2D]/60 font-sans">Copie a mensagem pronta com o link do seu site para enviar no WhatsApp aos convidados!</p>
          </div>

          <div className="bg-[#2D2D2D] text-emerald-300 p-6 rounded-3xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner border border-stone-800">
            {getWhatsAppMessage()}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleCopyWhatsAppInvite()}
              className="flex-1 py-3.5 bg-[#2D2D2D] hover:bg-black active:scale-98 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              {copiedInvite ? <Check className="w-4 h-4 text-[#C5A059]" /> : <Copy className="w-4 h-4 text-[#C5A059]" />}
              <span>{copiedInvite ? 'Texto Copiado!' : 'Copiar Texto para WhatsApp'}</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppMessage())}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-3.5 bg-emerald-800 hover:bg-emerald-900 active:scale-98 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* TAB 5: CONFIGURAÇÕES DO EVENTO */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DFD5] shadow-xs max-w-2xl mx-auto space-y-6 mt-6">
          <div className="space-y-1">
            <h2 className="font-serif italic text-2xl font-bold text-[#2D2D2D]">Configurações do Chá de Panela</h2>
            <p className="text-xs text-[#2D2D2D]/60 font-sans">Personalize dados dos noivos, data, horário, local e chave PIX</p>
          </div>

          {settingsSuccess && (
            <div className="p-4 text-xs bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 font-bold">
              Configurações salvas com sucesso!
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Couple Photo Upload System */}
            <CouplePhotoUploader
              currentPhotoUrl={eventForm.coverImage}
              onPhotoChange={(url) => setEventForm({ ...eventForm, coverImage: url })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Nome da Noiva
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.brideName}
                  onChange={e => setEventForm({ ...eventForm, brideName: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Nome do Noivo
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.groomName}
                  onChange={e => setEventForm({ ...eventForm, groomName: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Título do Evento
              </label>
              <input 
                type="text"
                required
                value={eventForm.eventTitle}
                onChange={e => setEventForm({ ...eventForm, eventTitle: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Data do Evento
                </label>
                <input 
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Horário
                </label>
                <input 
                  type="text"
                  placeholder="Ex: 15:30"
                  value={eventForm.time}
                  onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Endereço Completo
              </label>
              <input 
                type="text"
                value={eventForm.location}
                onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Link do Google Maps
              </label>
              <input 
                type="url"
                value={eventForm.googleMapsUrl}
                onChange={e => setEventForm({ ...eventForm, googleMapsUrl: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Chave PIX
                </label>
                <input 
                  type="text"
                  value={eventForm.pixKey}
                  onChange={e => setEventForm({ ...eventForm, pixKey: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Titular do PIX
                </label>
                <input 
                  type="text"
                  value={eventForm.pixName}
                  onChange={e => setEventForm({ ...eventForm, pixName: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Mensagem de Boas-Vindas aos Convidados
              </label>
              <textarea 
                rows={3}
                value={eventForm.welcomeMessage}
                onChange={e => setEventForm({ ...eventForm, welcomeMessage: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Senha de Acesso do Painel
              </label>
              <input 
                type="text"
                value={eventForm.adminPassword}
                onChange={e => setEventForm({ ...eventForm, adminPassword: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>

            <div className="pt-4 border-t border-[#E5DFD5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setResetConfirming(true)}
                className="text-xs font-semibold text-rose-700 hover:underline"
              >
                Restaurar dados de exemplo
              </button>

              <button
                type="submit"
                disabled={settingsLoading}
                className="px-6 py-3 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{settingsLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>

          {/* Reset Modal confirmation */}
          {resetConfirming && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2D2D]/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#E5DFD5] text-center shadow-xl">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="font-serif italic font-bold text-[#2D2D2D] text-lg">Restaurar Dados?</h3>
                <p className="text-xs text-[#2D2D2D]/60 font-sans">
                  Isso irá restaurar a lista inicial de exemplo com convidados e presentes padrão.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setResetConfirming(false)}
                    className="flex-1 py-3 text-xs font-bold text-[#2D2D2D] bg-[#F2ECE4] rounded-2xl transition hover:bg-[#E5DFD5]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      await onResetData();
                      setResetConfirming(false);
                      setIsAuthenticated(false);
                    }}
                    className="flex-1 py-3 text-xs font-bold text-white bg-rose-600 rounded-2xl hover:bg-rose-700 transition"
                  >
                    Restaurar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: BANCO DE DADOS EM NUVEM (Exclusivo Super Admin) */}
      {activeTab === 'firebase' && isSuperAdmin && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DFD5] shadow-xs max-w-3xl mx-auto space-y-6 mt-6">
          <div className="flex items-start justify-between border-b border-[#E5DFD5] pb-5">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-[#C5A059]" />
                <h2 className="font-serif italic text-2xl font-bold text-[#2D2D2D]">Banco de Dados em Nuvem</h2>
              </div>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">
                Sincronização instantânea e armazenamento em nuvem com criptografia de ponta a ponta
              </p>
            </div>
            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conectado</span>
            </div>
          </div>

          {/* Status Message */}
          {firebaseStatus !== 'idle' && (
            <div className={`p-4 text-xs rounded-2xl border font-bold flex items-center space-x-2 ${
              firebaseStatus === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : firebaseStatus === 'testing'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{firebaseMessage}</span>
            </div>
          )}

          {/* Credentials Details */}
          <div className="space-y-4">
            <div className="p-4 bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Status do Armazenamento em Nuvem</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#2D2D2D]/60 block uppercase">Identificador do Projeto</span>
                  <span className="font-mono text-[#2D2D2D] font-bold">{firebaseConfig.projectId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#2D2D2D]/60 block uppercase">Nome do Banco Firestore (Selecione no Console)</span>
                  <span className="font-mono text-[#C5A059] font-bold bg-[#FAF3E0] px-2 py-0.5 rounded border border-[#C5A059]/30 block truncate">
                    {firebaseConfig.firestoreDatabaseId || '(default)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#2D2D2D]/60 block uppercase">Domínio Seguro</span>
                  <span className="font-mono text-[#2D2D2D] font-bold">{firebaseConfig.authDomain}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#2D2D2D]/60 block uppercase">Servidor de Fotos/Mídia</span>
                  <span className="font-mono text-[#2D2D2D] font-bold truncate block">{firebaseConfig.storageBucket}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-sans">
                <strong>Atenção para visualizar os dados no Firebase Console:</strong> Por padrão, o Firebase Console abre no banco <code>(default)</code>. Para ver suas coleções, clique no menu suspenso de bancos de dados no topo do Firebase Console e selecione <code>{firebaseConfig.firestoreDatabaseId}</code>.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  setFirebaseStatus('testing');
                  setFirebaseMessage('Enviando e sincronizando todos os dados no Firestore...');
                  const ok = await syncAllToFirestore({ eventInfo, gifts, guests });
                  if (ok) {
                    setFirebaseStatus('success');
                    setFirebaseMessage('Dados do evento, presentes e convidados enviados e gravados com sucesso no seu Firebase!');
                  } else {
                    setFirebaseStatus('error');
                    setFirebaseMessage('Falha ao gravar no Firestore. Verifique as regras e status do Firebase Console.');
                  }
                }}
                className="px-6 py-3 bg-[#C5A059] hover:bg-[#b08d46] active:scale-95 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-white" />
                <span>Sincronizar Dados no Firebase Agora</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setFirebaseStatus('testing');
                  setFirebaseMessage('Testando conexão com o Firestore...');
                  const ok = await testFirebaseConnection();
                  if (ok) {
                    setFirebaseStatus('success');
                    setFirebaseMessage('Conexão estabelecida com sucesso com o seu projeto Firebase!');
                  } else {
                    setFirebaseStatus('error');
                    setFirebaseMessage('Não foi possível se conectar ao Firestore. Verifique se o banco Firestore está ativo no Firebase Console.');
                  }
                }}
                className="px-6 py-3 bg-[#2D2D2D] hover:bg-black active:scale-95 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Testar Conexão Firebase</span>
              </button>
            </div>
          </div>
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

      {/* Couple Drawer (Painel de Dados dos Noivos para Mobile e Desktop) */}
      {isCoupleDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2D2D]/60 backdrop-blur-xs transition-all duration-300">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border-t sm:border border-[#E5DFD5] max-h-[92vh] sm:max-h-[90vh] flex flex-col transition-transform animate-slide-up sm:animate-fade-in">
            {/* Mobile Touch Drag Bar */}
            <div className="w-12 h-1.5 bg-[#E5DFD5] rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

            <div className="bg-[#FAF9F6] px-5 sm:px-6 py-4 border-b border-[#E5DFD5] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#F2ECE4] text-[#C5A059] rounded-2xl shadow-2xs">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D2D2D]">
                    Painel dos Noivos
                  </h3>
                  <p className="text-xs text-[#2D2D2D]/60 font-sans">
                    Atualize nomes, data, local e chave PIX do casal
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCoupleDrawerOpen(false)}
                className="text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-2 rounded-xl hover:bg-[#F2ECE4] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                await handleSaveSettings(e);
                setIsCoupleDrawerOpen(false);
              }} 
              className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1"
            >
              {settingsSuccess && (
                <div className="p-3.5 text-xs bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 font-bold flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dados dos noivos atualizados com sucesso!</span>
                </div>
              )}

              {/* Upload Foto do Casal */}
              <CouplePhotoUploader
                currentPhotoUrl={eventForm.coverImage}
                onPhotoChange={(url) => setEventForm({ ...eventForm, coverImage: url })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Nome da Noiva <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={eventForm.brideName}
                    onChange={e => setEventForm({ ...eventForm, brideName: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Nome do Noivo <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={eventForm.groomName}
                    onChange={e => setEventForm({ ...eventForm, groomName: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Título do Evento
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.eventTitle}
                  onChange={e => setEventForm({ ...eventForm, eventTitle: e.target.value })}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Data do Chá de Panela
                  </label>
                  <input 
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Horário
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: 15:30"
                    value={eventForm.time}
                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Endereço Completo
                </label>
                <input 
                  type="text"
                  value={eventForm.location}
                  onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Link do Google Maps
                </label>
                <input 
                  type="url"
                  value={eventForm.googleMapsUrl}
                  onChange={e => setEventForm({ ...eventForm, googleMapsUrl: e.target.value })}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Chave PIX
                  </label>
                  <input 
                    type="text"
                    value={eventForm.pixKey}
                    onChange={e => setEventForm({ ...eventForm, pixKey: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                    Titular do PIX
                  </label>
                  <input 
                    type="text"
                    value={eventForm.pixName}
                    onChange={e => setEventForm({ ...eventForm, pixName: e.target.value })}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Mensagem de Boas-Vindas aos Convidados
                </label>
                <textarea 
                  rows={3}
                  value={eventForm.welcomeMessage}
                  onChange={e => setEventForm({ ...eventForm, welcomeMessage: e.target.value })}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-end space-x-3 pb-2">
                <button
                  type="button"
                  onClick={() => setIsCoupleDrawerOpen(false)}
                  className="px-5 py-3 text-xs font-bold text-[#2D2D2D] hover:bg-[#F2ECE4] rounded-2xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white bg-[#2D2D2D] hover:bg-black active:scale-95 rounded-2xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>{settingsLoading ? 'Salvando...' : 'Salvar Dados do Casal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
