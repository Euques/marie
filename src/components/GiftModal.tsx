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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-rose-100">
        <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <GiftIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-800">
                {gift ? 'Editar Presente' : 'Cadastrar Novo Presente'}
              </h3>
              <p className="text-xs text-stone-500">
                {gift ? 'Altere as informações do presente' : 'Adicione um novo item para a lista de chá de panela'}
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
              Nome do Item <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Batedeira Planetária Inox"
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
                Faixa de Preço Estimada
              </label>
              <input 
                type="text"
                placeholder="Ex: R$ 100 - R$ 180"
                value={priceRange}
                onChange={e => setPriceRange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Descrição / Dica de Cor, Marca ou Modelo
            </label>
            <textarea 
              rows={2}
              placeholder="Ex: Preferência na cor Inox ou Preto. Sugestão de marca: Arno ou Britânia."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Link de Exemplo para Compra (Opcional)
            </label>
            <input 
              type="url"
              placeholder="https://www.loja.com.br/produto..."
              value={suggestedUrl}
              onChange={e => setSuggestedUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
            />
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={isClaimed}
                onChange={e => setIsClaimed(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-400"
              />
              <span className="text-xs font-semibold text-stone-700">Marcar este presente como já reservado</span>
            </label>

            {isClaimed && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Nome do Convidado que escolheu
                </label>
                <input 
                  type="text"
                  placeholder="Nome do convidado"
                  value={claimedByGuestName}
                  onChange={e => setClaimedByGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition"
                />
              </div>
            )}
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
              <span>{gift ? 'Salvar Alterações' : 'Cadastrar Presente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
