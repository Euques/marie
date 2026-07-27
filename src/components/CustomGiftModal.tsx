import React, { useState } from 'react';
import { GiftCategory } from '../types';
import { Gift, X, Plus, Sparkles } from 'lucide-react';

interface CustomGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  isGuestView?: boolean;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const CustomGiftModal: React.FC<CustomGiftModalProps> = ({ isOpen, onClose, onAdd, isGuestView = false }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GiftCategory>('Cozinha');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do presente.');
      return;
    }

    if (isGuestView && !guestName.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onAdd({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        priceRange: priceRange.trim() || undefined,
        isCustom: isGuestView,
        claimedByGuestName: isGuestView ? guestName.trim() : undefined
      });
      // reset
      setName('');
      setDescription('');
      setPriceRange('');
      setGuestName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar. Tente novamente.');
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-800">
                {isGuestView ? 'Sugerir Presente Especial' : 'Adicionar Novo Presente'}
              </h3>
              <p className="text-xs text-stone-500">
                {isGuestView ? 'Adicione um mimo que você queira dar aos noivos' : 'Adicione um item para a lista de presentes'}
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

          {isGuestView && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Seu Nome <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: Ana Maria"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Nome do Presente <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Aparelho de Fondue 11 peças"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as GiftCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Faixa de Preço (Opcional)
              </label>
              <input 
                type="text"
                placeholder="Ex: R$ 80 - R$ 120"
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Detalhes / Preferência de Cor ou Marca
            </label>
            <textarea 
              rows={2}
              placeholder="Ex: Preferência na cor Inox ou Vermelho"
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              <Plus className="w-4 h-4" />
              <span>{isGuestView ? 'Dar este Presente' : 'Adicionar à Lista'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
