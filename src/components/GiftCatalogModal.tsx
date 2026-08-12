import React, { useState } from 'react';
import { Gift, GiftCategory } from '../types';
import { TEMPLATE_GIFTS } from '../data/initialData';
import { 
  Gift as GiftIcon, Search, Sparkles, Check, Plus, Trash2, 
  X, Filter, CheckCircle2, ShoppingBag, RotateCcw 
} from 'lucide-react';

interface GiftCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGifts: Gift[];
  onSaveGift: (giftData: Omit<Gift, 'id'> & { id?: string }) => Promise<void>;
  onDeleteGift: (id: string) => Promise<void>;
  onImportAllTemplateGifts?: () => Promise<void>;
  onClearGifts?: () => Promise<void>;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const GiftCatalogModal: React.FC<GiftCatalogModalProps> = ({
  isOpen,
  onClose,
  currentGifts,
  onSaveGift,
  onDeleteGift,
  onImportAllTemplateGifts,
  onClearGifts
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter template gifts
  const filteredTemplates = TEMPLATE_GIFTS.filter(t => {
    const matchesCategory = selectedCategory === 'Todas' || t.category === selectedCategory;
    const matchesSearch = !searchTerm.trim() || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Check if a template gift is currently in couple's list
  const findExistingGift = (templateName: string) => {
    return currentGifts.find(g => g.name.trim().toLowerCase() === templateName.trim().toLowerCase());
  };

  const handleToggleGift = async (template: typeof TEMPLATE_GIFTS[0]) => {
    try {
      setLoadingItemId(template.name);
      const existing = findExistingGift(template.name);
      if (existing) {
        // Remove from couple's list
        await onDeleteGift(existing.id);
      } else {
        // Add to couple's list
        await onSaveGift({
          name: template.name,
          category: template.category as GiftCategory,
          description: template.description || '',
          priceRange: template.priceRange || 'Até R$ 100',
          isClaimed: false
        });
      }
    } catch (err) {
      console.error('Erro ao alternar presente:', err);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleAddCategoryGifts = async () => {
    if (selectedCategory === 'Todas') {
      if (onImportAllTemplateGifts) {
        await onImportAllTemplateGifts();
      }
      return;
    }

    const categoryTemplates = TEMPLATE_GIFTS.filter(t => t.category === selectedCategory);
    for (const item of categoryTemplates) {
      if (!findExistingGift(item.name)) {
        await onSaveGift({
          name: item.name,
          category: item.category as GiftCategory,
          description: item.description || '',
          priceRange: item.priceRange || 'Até R$ 100',
          isClaimed: false
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-[#E5DFD5] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-[#FAF9F6] border-b border-[#E5DFD5] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#2D2D2D] text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] bg-[#F2ECE4] px-2.5 py-0.5 rounded-full">
                Sugestões de Presentes
              </span>
              <h2 className="text-lg sm:text-2xl font-serif font-bold text-[#2D2D2D] mt-0.5">
                Escolha os Presentes do Casal
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-white hover:bg-[#F2ECE4] border border-[#E5DFD5] rounded-full flex items-center justify-center text-[#2D2D2D] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COUNTER & QUICK ACTIONS BANNER */}
        <div className="bg-gradient-to-r from-[#2D2D2D] to-[#1A1A1A] text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
            <span className="font-medium">
              <strong className="text-[#C5A059] font-bold text-sm">{currentGifts.length}</strong> {currentGifts.length === 1 ? 'presente selecionado' : 'presentes selecionados'} para sua lista
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleAddCategoryGifts}
              className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#B38F48] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{selectedCategory === 'Todas' ? 'Adicionar Todas Sugestões' : `Adicionar Todos de ${selectedCategory}`}</span>
            </button>

            {onClearGifts && currentGifts.length > 0 && (
              <button
                onClick={onClearGifts}
                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/50 font-bold text-[10px] uppercase tracking-wider rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar</span>
              </button>
            )}
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="p-4 bg-white border-b border-[#E5DFD5] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#2D2D2D]/40 absolute left-3.5 top-3" />
            <input 
              type="text"
              placeholder="Buscar presente sugerido (ex: Air Fryer, Panelas, Toalhas)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] outline-none transition"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('Todas')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'Todas'
                  ? 'bg-[#2D2D2D] text-white shadow-xs'
                  : 'bg-[#F2ECE4] text-[#2D2D2D] hover:bg-[#E5DFD5]'
              }`}
            >
              Todas ({TEMPLATE_GIFTS.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = TEMPLATE_GIFTS.filter(t => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#2D2D2D] text-white shadow-xs'
                      : 'bg-[#FAF9F6] border border-[#E5DFD5] text-[#2D2D2D] hover:bg-[#F2ECE4]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* GIFTS CATALOG GRID */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#FAF9F6]/50">
          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <GiftIcon className="w-8 h-8 text-[#C5A059] mx-auto opacity-60" />
              <p className="text-sm font-bold text-[#2D2D2D]">Nenhum presente encontrado</p>
              <p className="text-xs text-[#2D2D2D]/60">Tente buscar por outro termo ou selecione outra categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTemplates.map((template, idx) => {
                const existing = findExistingGift(template.name);
                const isSelected = !!existing;
                const isLoading = loadingItemId === template.name;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs'
                        : 'bg-white border-[#E5DFD5] hover:border-[#C5A059]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isSelected
                            ? 'bg-emerald-200/60 text-emerald-900 border border-emerald-300'
                            : 'bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5]'
                        }`}>
                          {template.category}
                        </span>

                        {template.priceRange && (
                          <span className="text-[10px] font-medium text-[#2D2D2D]/60 bg-white/80 px-2 py-0.5 rounded-md border border-[#E5DFD5]">
                            {template.priceRange}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-[#2D2D2D] leading-snug">
                        {template.name}
                      </h4>

                      {template.description && (
                        <p className="text-xs text-[#2D2D2D]/70 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E5DFD5]/60 flex items-center justify-between">
                      {isSelected ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleGift(template)}
                          className="w-full py-2 bg-emerald-600 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs group"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white group-hover:hidden" />
                          <X className="w-4 h-4 text-white hidden group-hover:block" />
                          <span className="group-hover:hidden">✅ Na sua lista</span>
                          <span className="hidden group-hover:inline">Remover da lista</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleGift(template)}
                          className="w-full py-2 bg-[#2D2D2D] hover:bg-black text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 shadow-xs"
                        >
                          <Plus className="w-4 h-4 text-[#C5A059]" />
                          <span>Adicionar à Minha Lista</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#FAF9F6] border-t border-[#E5DFD5] flex items-center justify-between">
          <div className="text-xs font-semibold text-[#2D2D2D]/70">
            {currentGifts.length} {currentGifts.length === 1 ? 'item no total' : 'itens no total na sua lista'}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#2D2D2D] hover:bg-black text-white font-bold text-xs uppercase tracking-[0.15em] rounded-2xl transition shadow-xs cursor-pointer active:scale-95"
          >
            Concluir e Salvar Lista
          </button>
        </div>

      </div>
    </div>
  );
};
