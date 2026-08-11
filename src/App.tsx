import React, { useState, useEffect } from 'react';
import { AppData, EventInfo, Gift, GiftCategory, Guest, GuestAuthSession, AppRoute } from './types';
import { initialData } from './data/initialData';
import { HomePage } from './components/HomePage';
import { GiftsPage } from './components/GiftsPage';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { Heart, Sparkles, ArrowLeft } from 'lucide-react';
import { subscribeToAuthChanges, logoutFirebase } from './lib/firebase';

const getRouteFromPath = (path: string): AppRoute => {
  const p = path.toLowerCase();
  if (p.includes('/presentes') || p.includes('/gifts')) return 'presentes';
  if (p.includes('/login')) return 'login';
  if (p.includes('/noiva') || p.includes('/admin')) return 'noiva';
  return 'home';
};

const getPathFromRoute = (route: AppRoute): string => {
  switch (route) {
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
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
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
      }
    });
    return () => unsubscribe();
  }, []);

  const navigate = (route: AppRoute) => {
    const path = getPathFromRoute(route);
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

  // Fetch data from server
  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Could not fetch /api/data, using local state:', err);
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

  // API Call Handlers
  const handleClaimGift = async (giftId: string, claimData: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => {
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
    const res = await fetch('/api/event', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });

    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    await fetchData();
    showToast('Informações do evento salvas!');
  };

  const handleSaveGuest = async (guestData: Omit<Guest, 'id' | 'updatedAt'> & { id?: string }) => {
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
    const res = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir convidado');
    await fetchData();
    showToast('Convidado removido!');
  };

  const handleSaveGift = async (giftData: Omit<Gift, 'id'> & { id?: string }) => {
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

      {/* Main Content Area based on URL Route */}
      <main className="flex-1 w-full py-4 sm:py-8 px-2 sm:px-4">
        {currentRoute === 'home' && (
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
                Painel da Noiva & Noivo
              </span>
              <button
                onClick={() => navigate('home')}
                className="px-3.5 py-2 text-xs font-bold bg-[#FAF9F6] border border-[#E5DFD5] hover:bg-[#F2ECE4] text-[#2D2D2D] rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
                <span>Voltar</span>
              </button>
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
            />
          </div>
        )}
      </main>

      {/* Footer minimal */}
      <footer className="no-print py-6 text-center text-xs text-[#2D2D2D]/50 border-t border-[#E5DFD5]/60 bg-white/50">
        <div className="flex items-center justify-center space-x-1 font-serif text-sm text-[#2D2D2D]">
          <span>{data.eventInfo.brideName}</span>
          <Heart className="w-3.5 h-3.5 text-[#C5A059] fill-current" />
          <span>{data.eventInfo.groomName}</span>
        </div>
        <p className="mt-1 text-[11px] font-sans text-[#2D2D2D]/60">Chá de Panela • Lista de Presentes & Confirmação de Presença</p>
      </footer>
    </div>
  );
}
