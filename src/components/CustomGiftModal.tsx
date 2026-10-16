import React, { useState, useRef, useEffect } from 'react';
import { GiftCategory } from '../types';
import { uploadPhotoToStorage } from '../lib/firebase';
import { 
  X, Plus, Sparkles, Upload, Image as ImageIcon, Trash2, 
  Loader2, Camera, MessageSquare, Phone, Check, ExternalLink, AlertCircle
} from 'lucide-react';

interface CustomGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (data: { 
    name: string; 
    category: GiftCategory; 
    description?: string; 
    priceRange?: string; 
    imageUrl?: string; 
    isCustom?: boolean; 
    claimedByGuestName?: string;
  }) => Promise<void>;
  onSubmit?: (data: any) => Promise<void>;
  isGuestView?: boolean;
  guestName?: string;
  brideName?: string;
  bridePhone?: string;
  pixKey?: string;
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
  onSubmit,
  isGuestView = true,
  guestName: initialGuestName = '',
  brideName = 'Noiva',
  bridePhone = '',
  pixKey = ''
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
  const [sentSuccess, setSentSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialGuestName) {
      setGuestName(initialGuestName);
    }
  }, [initialGuestName, isOpen]);

  if (!isOpen) return null;

  // Resolve bride's contact phone: first bridePhone, then fallback to pixKey if it is formatted like a phone number
  const resolveBridePhone = (): string => {
    if (bridePhone && bridePhone.trim()) {
      return bridePhone.replace(/\D/g, '');
    }
    if (pixKey) {
      const cleanPix = pixKey.replace(/\D/g, '');
      if (cleanPix.length === 10 || cleanPix.length === 11) {
        return cleanPix;
      }
    }
    return '';
  };

  const cleanPhone = resolveBridePhone();

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

          try {
            const firebaseStorageUrl = await uploadPhotoToStorage(base64Data, 'gifts');
            if (firebaseStorageUrl) {
              setImageUrl(firebaseStorageUrl);
              setUploadingImage(false);
              return;
            }
          } catch (storageErr) {
            console.warn('Fallback upload:', storageErr);
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

  const generateWhatsAppMessage = () => {
    const sender = guestName.trim() || 'Convidado(a)';
    const giftTitle = name.trim();
    const cat = category;
    const price = priceRange.trim();
    const details = description.trim();

    let text = `*Sugestão de Presente para o Chá de Panela* 🎁\n\n`;
    text += `Olá, ${brideName}! Aqui é *${sender}*.\n`;
    text += `Gostaria de sugerir este presente para a sua lista:\n\n`;
    text += `✨ *Presente:* ${giftTitle}\n`;
    text += `🏷️ *Categoria:* ${cat}\n`;
    if (price) {
      text += `💰 *Faixa de Preço:* ${price}\n`;
    }
    if (details) {
      text += `📝 *Detalhes / Onde encontrar:* ${details}\n`;
    }
    text += `\nO que você acha? Posso levar esse? 🥰`;
    return text;
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

    // IF GUEST VIEW: SEND SUGGESTION VIA WHATSAPP TO THE BRIDE (DO NOT CREATE IN DB)
    if (isGuestView) {
      const msg = generateWhatsAppMessage();

      if (cleanPhone) {
        const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;
        
        // Open WhatsApp in new tab
        window.open(waUrl, '_blank');
        
        setSentSuccess(true);
        setTimeout(() => {
          setSentSuccess(false);
          setName('');
          setDescription('');
          setPriceRange('');
          onClose();
        }, 2500);
        return;
      } else {
        // If bride has not yet registered phone, copy text and open general WhatsApp
        try {
          await navigator.clipboard.writeText(msg);
        } catch {
          // ignore clipboard errors
        }
        const waGeneric = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(waGeneric, '_blank');

        setSentSuccess(true);
        setTimeout(() => {
          setSentSuccess(false);
          setName('');
          setDescription('');
          setPriceRange('');
          onClose();
        }, 3000);
        return;
      }
    }

    // IF ADMIN VIEW: CALL onAdd/onSubmit
    try {
      setLoading(true);
      setError('');
      const handler = onAdd || onSubmit;
      if (handler) {
        await handler({
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          priceRange: priceRange.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          isCustom: false
        });
      }
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
            <div className={`p-2.5 rounded-2xl shadow-2xs ${isGuestView ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#F2ECE4] text-[#C5A059]'}`}>
              {isGuestView ? <MessageSquare className="w-5 h-5 text-emerald-600" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2D2D2D]">
                {isGuestView ? 'Sugerir Presente no WhatsApp' : 'Adicionar Novo Presente'}
              </h3>
              <p className="text-xs text-[#2D2D2D]/60 font-sans">
                {isGuestView 
                  ? `Envie sua ideia de presente diretamente para o WhatsApp de ${brideName || 'Noiva'}` 
                  : 'Adicione um item para a lista de presentes'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-[#2D2D2D]/50 hover:text-[#2D2D2D] p-2 rounded-xl hover:bg-[#F2ECE4] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-[#2D2D2D]">Mensagem Preparada no WhatsApp!</h4>
              <p className="text-xs text-[#2D2D2D]/70 max-w-sm mx-auto">
                O WhatsApp foi aberto com os dados da sua sugestão para {brideName}. Basta clicar em enviar!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 font-bold">
                {error}
              </div>
            )}

            {/* DESTINATION WHATSAPP BADGE */}
            {isGuestView && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start space-x-2.5 text-xs text-emerald-900">
                <Phone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px] text-emerald-950">
                    Destino: WhatsApp da Noiva ({brideName || 'Noiva'})
                  </p>
                  <p className="text-[10px] text-emerald-800/80 font-sans">
                    {cleanPhone 
                      ? `Sua sugestão será enviada diretamente para o número cadastrado no painel.`
                      : 'O WhatsApp será aberto com o texto pronto para você encaminhar à noiva.'}
                  </p>
                </div>
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
                Detalhes, Marca, Cor ou Link onde encontrar (Opcional)
              </label>
              <textarea 
                rows={3}
                placeholder="Ex: Vi uma opção ótima em inox na loja tal / link do produto"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 text-base sm:text-sm border border-[#E5DFD5] bg-[#FAF9F6] rounded-2xl focus:border-[#C5A059] focus:bg-white outline-none transition font-sans resize-none"
              />
            </div>

            {/* ONLY SHOW IMAGE UPLOADER IF NOT GUEST VIEW (ADMIN MODE) */}
            {!isGuestView && (
              <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] flex items-center space-x-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Foto do Presente (Opcional)</span>
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
                          <span>{imageUrl ? 'Trocar Foto' : 'Subir Foto'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-end space-x-3 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 text-xs font-bold text-[#2D2D2D] hover:bg-[#F2ECE4] rounded-2xl transition cursor-pointer"
              >
                Cancelar
              </button>
              
              {isGuestView ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white bg-emerald-800 hover:bg-emerald-900 active:scale-95 rounded-2xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-200" />
                  <span>Enviar para WhatsApp da Noiva</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || uploadingImage}
                  className="flex-1 sm:flex-initial px-6 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white bg-[#2D2D2D] hover:bg-black active:scale-95 rounded-2xl shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#C5A059]" />
                  <span>{uploadingImage ? 'Enviando Foto...' : loading ? 'Salvando...' : 'Adicionar à Lista'}</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
