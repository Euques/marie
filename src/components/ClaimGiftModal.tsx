import React, { useState } from 'react';
import { Gift } from '../types';
import { Gift as GiftIcon, X, Check, Heart, User, Phone, Mail, FileText } from 'lucide-react';

interface ClaimGiftModalProps {
  gift: Gift | null;
  defaultGuestName?: string;
  defaultGuestEmail?: string;
  onClose: () => void;
  onConfirm: (giftId: string, data: { guestName: string; guestEmail?: string; guestPhone?: string; notes?: string }) => Promise<void>;
}

export const ClaimGiftModal: React.FC<ClaimGiftModalProps> = ({ gift, defaultGuestName = '', defaultGuestEmail = '', onClose, onConfirm }) => {
  const [guestName, setGuestName] = useState(defaultGuestName);
  const [guestEmail, setGuestEmail] = useState(defaultGuestEmail);
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (gift) {
      if (defaultGuestName) setGuestName(defaultGuestName);
      if (defaultGuestEmail) setGuestEmail(defaultGuestEmail);
    }
  }, [gift, defaultGuestName, defaultGuestEmail]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2D2D]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-[#E5DFD5]">
        {/* Header */}
        <div className="bg-[#FAF9F6] px-6 py-5 border-b border-[#E5DFD5] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#F2ECE4] text-[#C5A059] rounded-2xl shadow-2xs">
              <GiftIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2D2D2D]">Escolher Presente</h3>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">Marque como escolhido por você</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[#2D2D2D]/40 hover:text-[#2D2D2D] p-2 rounded-xl hover:bg-[#F2ECE4] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gift Summary Box */}
        <div className="px-6 pt-5 pb-2">
          <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#E5DFD5]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] bg-[#F2ECE4] px-3 py-1 rounded-full inline-block mb-2">
              {gift.category}
            </span>
            <h4 className="font-bold text-[#2D2D2D] text-base">{gift.name}</h4>
            {gift.description && (
              <p className="text-xs text-[#2D2D2D]/70 mt-1">{gift.description}</p>
            )}
            {gift.priceRange && (
              <p className="text-xs text-[#C5A059] mt-1 font-medium">Faixa estimada: {gift.priceRange}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Seu Nome Completo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
              <input 
                type="text"
                required
                placeholder="Ex: Maria Silva"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                WhatsApp / Celular
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                <input 
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                E-mail (Opcional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
                <input 
                  type="email"
                  placeholder="maria@email.com"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Recadinho / Observação (Opcional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3.5" />
              <textarea 
                rows={2}
                placeholder="Ex: Já comprei e levarei no dia do chá! ❤️"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition resize-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-[#2D2D2D] hover:bg-[#F2ECE4] rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[#2D2D2D] hover:bg-black active:scale-95 rounded-2xl shadow-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-[#C5A059] fill-current" />
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
