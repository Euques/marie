import React, { useState, useEffect } from 'react';
import { AppData, EventInfo, Gift, GiftCategory, Guest } from './types';
import { initialData } from './data/initialData';
import { HeaderNav } from './components/HeaderNav';
import { GuestView } from './components/GuestView';
import { AdminPanel } from './components/AdminPanel';
import { Heart, Sparkles, Check } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData>(initialData);
  const [currentView, setCurrentView] = useState<'guest' | 'admin'>('guest');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
    <div className="min-h-screen flex flex-col bg-rose-50/30 text-stone-800 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navbar */}
      <HeaderNav 
        currentView={currentView}
        onViewChange={setCurrentView}
        eventInfo={data.eventInfo}
        onCopyLink={handleCopyLink}
        copiedLink={copiedLink}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentView === 'guest' ? (
          <GuestView 
            eventInfo={data.eventInfo}
            gifts={data.gifts}
            guests={data.guests}
            onClaimGift={handleClaimGift}
            onAddCustomGift={handleAddCustomGift}
            onSubmitRsvp={handleSubmitRsvp}
          />
        ) : (
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
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-rose-100 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center space-x-1.5 text-rose-600 font-serif font-bold text-sm">
            <span>{data.eventInfo.brideName}</span>
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{data.eventInfo.groomName}</span>
          </div>
          <p className="text-xs text-stone-500 font-sans">
            Organizador de Chá de Panela • Lista de Presentes & Confirmação de Presença
          </p>
        </div>
      </footer>
    </div>
  );
}
