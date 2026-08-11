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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2D2D]/60 backdrop-blur-xs transition-all duration-300">
      <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-t sm:border border-[#E5DFD5] max-h-[92vh] sm:max-h-[90vh] flex flex-col transition-transform animate-slide-up sm:animate-fade-in">
        {/* Mobile Pull Bar */}
        <div className="w-12 h-1.5 bg-[#E5DFD5] rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        <div className="bg-[#FAF9F6] px-5 sm:px-6 py-4 border-b border-[#E5DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#F2ECE4] text-[#C5A059] rounded-2xl shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D2D2D]">
                {isGuestView ? 'Sugerir Presente Especial' : 'Adicionar Novo Presente'}
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">
                {isGuestView ? 'Adicione um mimo que você queira dar aos noivos' : 'Adicione um item para a lista de presentes'}
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

          {isGuestView && (
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Seu Nome <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: Ana Maria"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Nome do Presente <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Aparelho de Fondue 11 peças"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as GiftCategory)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans text-[#2D2D2D]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                Faixa de Preço (Opcional)
              </label>
              <input 
                type="text"
                placeholder="Ex: R$ 80 - R$ 120"
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Detalhes / Preferência de Cor ou Marca
            </label>
            <textarea 
              rows={2}
              placeholder="Ex: Preferência na cor Inox ou Vermelho"
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>{isGuestView ? 'Dar este Presente' : 'Adicionar à Lista'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
