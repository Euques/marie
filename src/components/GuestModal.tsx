import React, { useState, useEffect } from 'react';
import { Guest, RsvpStatus } from '../types';
import { User, X, Check, Phone, Mail, Users, MessageSquare } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  guest?: Guest | null;
  onClose: () => void;
  onSave: (guestData: Omit<Guest, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
}

export const GuestModal: React.FC<GuestModalProps> = ({ isOpen, guest, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companions, setCompanions] = useState(0);
  const [status, setStatus] = useState<RsvpStatus>('pending');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (guest) {
      setName(guest.name || '');
      setEmail(guest.email || '');
      setPhone(guest.phone || '');
      setCompanions(guest.companions || 0);
      setStatus(guest.status || 'pending');
      setDietaryNotes(guest.dietaryNotes || '');
      setMessage(guest.message || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setCompanions(0);
      setStatus('pending');
      setDietaryNotes('');
      setMessage('');
    }
  }, [guest, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do convidado.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        id: guest?.id,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        companions: Number(companions) || 0,
        status,
        dietaryNotes: dietaryNotes.trim() || undefined,
        message: message.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar convidado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2D2D]/60 backdrop-blur-xs transition-all duration-300">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-t sm:border border-[#E5DFD5] max-h-[92vh] sm:max-h-[90vh] flex flex-col transition-transform animate-slide-up sm:animate-fade-in">
        {/* Mobile Pull Bar */}
        <div className="w-12 h-1.5 bg-[#E5DFD5] rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        <div className="bg-[#FAF9F6] px-5 sm:px-6 py-4 border-b border-[#E5DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#F2ECE4] text-[#C5A059] rounded-2xl shadow-2xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D2D2D]">
                {guest ? 'Editar Convidado' : 'Adicionar Convidado'}
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">
                {guest ? 'Atualize as informações do convidado' : 'Cadastre um novo convidado na lista'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-2 rounded-xl hover:bg-[#F2ECE4] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Ana Clara Lima"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                WhatsApp / Celular
              </label>
              <input 
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                E-mail (Opcional)
              </label>
              <input 
                type="email"
                placeholder="ana@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Acompanhantes
              </label>
              <select
                value={companions}
                onChange={e => setCompanions(Number(e.target.value))}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans text-[#2D2D2D]"
              >
                <option value={0}>Apenas o convidado (0)</option>
                <option value={1}>+ 1 acompanhante</option>
                <option value={2}>+ 2 acompanhantes</option>
                <option value={3}>+ 3 acompanhantes</option>
                <option value={4}>+ 4 ou mais acompanhantes</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Status da Presença
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as RsvpStatus)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans text-[#2D2D2D]"
              >
                <option value="confirmed">Confirmado (Vou!)</option>
                <option value="pending">Pendente (Aguardando)</option>
                <option value="declined">Recusado (Não poderei ir)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Mensagem para os noivos (Opcional)
            </label>
            <textarea 
              rows={3}
              placeholder="Mensagem deixada pelo convidado..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-end space-x-3 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-xs font-bold text-[#2D2D2D] hover:bg-[#F2ECE4] rounded-2xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white bg-[#2D2D2D] hover:bg-black active:scale-95 rounded-2xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#C5A059]" />
              <span>{guest ? 'Salvar Alterações' : 'Adicionar Convidado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
