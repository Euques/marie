import React, { useState, useEffect } from 'react';
import { Gift, GiftCategory } from '../types';
import { Gift as GiftIcon, X, Check, Link as LinkIcon, DollarSign, Tag, Info } from 'lucide-react';

interface GiftModalProps {
  isOpen: boolean;
  gift?: Gift | null;
  onClose: () => void;
  onSave: (giftData: Omit<Gift, 'id'> & { id?: string }) => Promise<void>;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const GiftModal: React.FC<GiftModalProps> = ({ isOpen, gift, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GiftCategory>('Cozinha');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [suggestedUrl, setSuggestedUrl] = useState('');
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimedByGuestName, setClaimedByGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gift) {
      setName(gift.name || '');
      setCategory(gift.category || 'Cozinha');
      setDescription(gift.description || '');
      setPriceRange(gift.priceRange || '');
      setSuggestedUrl(gift.suggestedUrl || '');
      setIsClaimed(Boolean(gift.isClaimed));
      setClaimedByGuestName(gift.claimedByGuestName || '');
    } else {
      setName('');
      setCategory('Cozinha');
      setDescription('');
      setPriceRange('');
      setSuggestedUrl('');
      setIsClaimed(false);
      setClaimedByGuestName('');
    }
  }, [gift, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do presente.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        id: gift?.id,
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        priceRange: priceRange.trim() || undefined,
        suggestedUrl: suggestedUrl.trim() || undefined,
        isClaimed,
        claimedByGuestName: isClaimed ? (claimedByGuestName.trim() || undefined) : undefined,
        isCustom: gift?.isCustom || false
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar presente.');
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
              <GiftIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D2D2D]">
                {gift ? 'Editar Presente' : 'Cadastrar Novo Presente'}
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">
                {gift ? 'Altere as informações do presente' : 'Adicione um novo item para a lista de chá de panela'}
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
              Nome do Item <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Batedeira Planetária Inox"
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
                Faixa de Preço Estimada
              </label>
              <input 
                type="text"
                placeholder="Ex: R$ 100 - R$ 180"
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Descrição / Dica de Cor, Marca ou Modelo
            </label>
            <textarea 
              rows={2}
              placeholder="Ex: Preferência na cor Inox ou Preto. Sugestão de marca: Arno ou Britânia."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Link de Exemplo para Compra (Opcional)
            </label>
            <input 
              type="url"
              placeholder="https://www.loja.com.br/produto..."
              value={suggestedUrl}
              onChange={e => setSuggestedUrl(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
            />
          </div>

          <div className="pt-3 border-t border-[#E5DFD5] space-y-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input 
                type="checkbox"
                checked={isClaimed}
                onChange={e => setIsClaimed(e.target.checked)}
                className="w-4 h-4 text-[#2D2D2D] rounded border-[#E5DFD5] focus:ring-[#C5A059]"
              />
              <span className="text-xs font-bold text-[#2D2D2D]">Marcar este presente como já reservado</span>
            </label>

            {isClaimed && (
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
                  Nome do Convidado que escolheu
                </label>
                <input 
                  type="text"
                  placeholder="Nome do convidado"
                  value={claimedByGuestName}
                  onChange={e => setClaimedByGuestName(e.target.value)}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans"
                />
              </div>
            )}
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
              <span>{gift ? 'Salvar Alterações' : 'Cadastrar Presente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
