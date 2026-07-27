import React, { useState } from 'react';
import { Gift } from '../types';
import { Gift as GiftIcon, X, Check, Heart, User, Phone, Mail, FileText } from 'lucide-react';

interface ClaimGiftModalProps {
  gift: Gift | null;
  onClose: () => void;
  onConfirm: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
}

export const ClaimGiftModal: React.FC<ClaimGiftModalProps> = ({ gift, onClose, onConfirm }) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!gift) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setError('Por favor, digite seu nome completo.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onConfirm(gift.id, {
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao reservar o presente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-rose-100">
        {/* Header */}
        <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <GiftIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-800">Escolher Presente</h3>
              <p className="text-xs text-stone-500">Marque como escolhido por você</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-rose-100/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gift Summary Box */}
        <div className="px-6 pt-5 pb-2">
          <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-100/60 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
              {gift.category}
            </span>
            <h4 className="font-semibold text-stone-800 text-base">{gift.name}</h4>
            {gift.description && (
              <p className="text-xs text-stone-600 mt-1">{gift.description}</p>
            )}
            {gift.priceRange && (
              <p className="text-xs text-rose-700/80 mt-1 font-medium">Faixa estimada: {gift.priceRange}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-100 text-rose-800 rounded-lg border border-rose-200 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Seu Nome Completo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input 
                type="text"
                required
                placeholder="Ex: Maria Silva"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                WhatsApp / Celular
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input 
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                E-mail (Opcional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input 
                  type="email"
                  placeholder="maria@email.com"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Recadinho / Observação (Opcional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <textarea 
                rows={2}
                placeholder="Ex: Já comprei e levarei no dia do chá! ❤️"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-200 flex items-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 fill-current" />
                  <span>Confirmar Escolha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
