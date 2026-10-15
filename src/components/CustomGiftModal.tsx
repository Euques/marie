import React, { useState, useRef, useEffect } from 'react';
import { GiftCategory } from '../types';
import { Gift, X, Plus, Sparkles, Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';

interface CustomGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; category: GiftCategory; description?: string; priceRange?: string; imageUrl?: string; isCustom?: boolean; claimedByGuestName?: string }) => Promise<void>;
  isGuestView?: boolean;
  guestName?: string;
}

const CATEGORIES: GiftCategory[] = [
  'Cozinha',
  'Mesa e Banho',
  'Eletrodomésticos',
  'Servir e Decoração',
  'Organização e Limpeza',
  'Mimos e Outros'
];

export const CustomGiftModal: React.FC<CustomGiftModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  isGuestView = false,
  guestName: initialGuestName = '' 
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GiftCategory>('Cozinha');
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [guestName, setGuestName] = useState(initialGuestName);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialGuestName) {
      setGuestName(initialGuestName);
    }
  }, [initialGuestName, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG).');
      return;
    }

    setUploadingImage(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 700;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let base64Data = '';
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            base64Data = canvas.toDataURL('image/jpeg', 0.80);
          } else {
            base64Data = event.target?.result as string;
          }

          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Data, fileName: file.name })
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.url) {
                setImageUrl(resData.url);
                setUploadingImage(false);
                return;
              }
            }
          } catch (uploadErr) {
            console.warn('Server upload fallback:', uploadErr);
          }

          setImageUrl(base64Data);
        } catch (err: any) {
          setError('Erro ao processar imagem.');
        } finally {
          setUploadingImage(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
        imageUrl: imageUrl.trim() || undefined,
        isCustom: isGuestView,
        claimedByGuestName: isGuestView ? guestName.trim() : undefined
      });
      // reset
      setName('');
      setDescription('');
      setPriceRange('');
      setImageUrl('');
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

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Foto do Presente (Opcional)
            </label>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center space-x-3 bg-[#FAF9F6] p-3 rounded-2xl border border-[#E5DFD5]">
              {imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#C5A059]">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-0.5 right-0.5 bg-rose-600 text-white p-0.5 rounded-full shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#F2ECE4] border border-dashed border-[#C5A059]/50 flex items-center justify-center shrink-0 text-[#C5A059]">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 text-[#C5A059] animate-spin" />
                      <span>Processando Foto...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{imageUrl ? 'Trocar Foto' : 'Enviar Foto'}</span>
                    </>
                  )}
                </button>
                <input 
                  type="url"
                  placeholder="Ou cole o link da foto (URL)..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E5DFD5] bg-white rounded-xl focus:border-[#C5A059] outline-none font-sans"
                />
              </div>
            </div>
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
