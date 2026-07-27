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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-rose-100">
        <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-800">
                {guest ? 'Editar Convidado' : 'Adicionar Convidado'}
              </h3>
              <p className="text-xs text-stone-500">
                {guest ? 'Atualize as informações do convidado' : 'Cadastre um novo convidado na lista'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-rose-100/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-100 text-rose-800 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Nome Completo <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Ana Clara Lima"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                WhatsApp / Celular
              </label>
              <input 
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                E-mail (Opcional)
              </label>
              <input 
                type="email"
                placeholder="ana@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Acompanhantes
              </label>
              <select
                value={companions}
                onChange={e => setCompanions(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white"
              >
                <option value={0}>Apenas o convidado (0)</option>
                <option value={1}>+ 1 acompanhante</option>
                <option value={2}>+ 2 acompanhantes</option>
                <option value={3}>+ 3 acompanhantes</option>
                <option value={4}>+ 4 ou mais acompanhantes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Status da Presença
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as RsvpStatus)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white"
              >
                <option value="confirmed">Confirmado (Vou!)</option>
                <option value="pending">Pendente (Aguardando)</option>
                <option value="declined">Recusado (Não poderei ir)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Mensagem para os noivos (Opcional)
            </label>
            <textarea 
              rows={2}
              placeholder="Mensagem deixada pelo convidado..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition resize-none"
            />
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
              <Check className="w-4 h-4" />
              <span>{guest ? 'Salvar Alterações' : 'Adicionar Convidado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
