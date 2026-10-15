import React, { useState, useEffect, useRef } from 'react';
import { Gift, GiftCategory } from '../types';
import { uploadPhotoToStorage } from '../lib/firebase';
import { Gift as GiftIcon, X, Check, Upload, Image as ImageIcon, Trash2, Loader2, Camera } from 'lucide-react';

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
  const [imageUrl, setImageUrl] = useState('');
  const [isClaimed, setIsClaimed] = useState(false);
  const [claimedByGuestName, setClaimedByGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (gift) {
      setName(gift.name || '');
      setCategory(gift.category || 'Cozinha');
      setDescription(gift.description || '');
      setPriceRange(gift.priceRange || '');
      setSuggestedUrl(gift.suggestedUrl || '');
      setImageUrl(gift.imageUrl || '');
      setIsClaimed(Boolean(gift.isClaimed));
      setClaimedByGuestName(gift.claimedByGuestName || '');
    } else {
      setName('');
      setCategory('Cozinha');
      setDescription('');
      setPriceRange('');
      setSuggestedUrl('');
      setImageUrl('');
      setIsClaimed(false);
      setClaimedByGuestName('');
    }
    setError('');
  }, [gift, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setUploadingImage(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        setUploadingImage(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;

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
          let base64Data = rawDataUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            base64Data = canvas.toDataURL('image/jpeg', 0.82);
          }

          // 1. Primary: Firebase Storage upload (same system as CouplePhotoUploader)
          try {
            const firebaseStorageUrl = await uploadPhotoToStorage(base64Data, 'gifts');
            if (firebaseStorageUrl) {
              setImageUrl(firebaseStorageUrl);
              setUploadingImage(false);
              return;
            }
          } catch (storageErr) {
            console.warn('Tentativa no Firebase Storage falhou, tentando /api/upload:', storageErr);
          }

          // 2. Secondary: Server endpoint /api/upload
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
            console.warn('Server upload fallback to direct data url:', uploadErr);
          }

          // 3. Fallback: optimized Data URL
          setImageUrl(base64Data);
        } catch (err: any) {
          setError('Erro ao processar imagem. Tente outra foto.');
        } finally {
          setUploadingImage(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      img.onerror = () => {
        setError('Não foi possível carregar a imagem selecionada.');
        setUploadingImage(false);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setError('Erro ao ler arquivo.');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

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
        imageUrl: imageUrl.trim() || undefined,
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

          {/* SISTEMA DE UPLOAD DIRETO PARA FOTO DO PRESENTE (SEM CAMPO DE URL) */}
          <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Foto do Presente</span>
                </label>
                <p className="text-[11px] text-[#2D2D2D]/60 font-sans mt-0.5">
                  Envie uma foto diretamente do seu celular ou computador
                </p>
              </div>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-rose-700 hover:text-rose-900 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover</span>
                </button>
              )}
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div 
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                className="relative group rounded-2xl overflow-hidden border-2 border-[#C5A059]/40 aspect-[4/3] bg-[#F2ECE4] shadow-2xs flex items-center justify-center cursor-pointer"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview do Presente" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="text-center p-2 text-[#2D2D2D]/50 space-y-1">
                    <ImageIcon className="w-7 h-7 mx-auto text-[#C5A059]" />
                    <span className="text-[9px] font-bold uppercase block">Sem foto</span>
                  </div>
                )}

                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-[11px] font-bold space-x-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                    <span>Enviando...</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-[#2D2D2D] hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#C5A059] animate-spin" />
                      <span>Processando Foto...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#C5A059]" />
                      <span>{imageUrl ? 'Trocar Foto do Aparelho' : 'Subir Foto do Celular / PC'}</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#2D2D2D]/55 text-center sm:text-left font-sans">
                  Formatos aceitos: JPG, PNG ou WebP (otimização automática).
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] mb-1.5">
              Link de Exemplo para Compra em Loja (Opcional)
            </label>
            <input 
              type="text"
              placeholder="Ex: https://www.loja.com.br/produto..."
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
              disabled={loading || uploadingImage}
              className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white bg-[#2D2D2D] hover:bg-black active:scale-95 rounded-2xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#C5A059]" />
              <span>{uploadingImage ? 'Enviando Foto...' : loading ? 'Salvando...' : (gift ? 'Salvar Alterações' : 'Cadastrar Presente')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
