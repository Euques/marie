import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Camera, Trash2, Check, Link as LinkIcon, Sparkles, RefreshCw } from 'lucide-react';
import { uploadPhotoToStorage } from '../lib/firebase';

interface CouplePhotoUploaderProps {
  currentPhotoUrl?: string;
  onPhotoChange: (newPhotoUrl: string) => void;
}

const PRESET_PHOTOS = [
  {
    name: 'Romântico no Por do Sol',
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Casal Sorrindo',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Abraço Elegante',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
  },
];

export const CouplePhotoUploader: React.FC<CouplePhotoUploaderProps> = ({
  currentPhotoUrl,
  onPhotoChange,
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) {
          setIsProcessing(false);
          return;
        }

        // Optimize image on Canvas first
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let optimizedDataUrl = rawDataUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          // 1. Primary: Upload to Firebase Storage
          try {
            const firebaseStorageUrl = await uploadPhotoToStorage(optimizedDataUrl, 'couples');
            if (firebaseStorageUrl) {
              onPhotoChange(firebaseStorageUrl);
              setIsProcessing(false);
              return;
            }
          } catch (storageErr) {
            console.warn('Tentativa direta no Firebase Storage falhou. Tentando upload no servidor /api/upload:', storageErr);
          }

          // 2. Secondary fallback: /api/upload
          try {
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: optimizedDataUrl, fileName: file.name })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.url) {
                onPhotoChange(data.url);
                setIsProcessing(false);
                return;
              }
            }
          } catch (serverErr) {
            console.warn('Erro ao salvar em /api/upload, usando data URL:', serverErr);
          }

          // 3. Fallback: optimized Data URL
          onPhotoChange(optimizedDataUrl);
          setIsProcessing(false);
        };
        img.src = rawDataUrl;
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro geral no upload da foto:', err);
      setIsProcessing(false);
      alert('Erro ao processar imagem. Tente novamente.');
    }
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onPhotoChange(customUrl.trim());
    setCustomUrl('');
    setShowUrlInput(false);
  };

  return (
    <div className="bg-[#FAF9F6] border border-[#E5DFD5] rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-[#2D2D2D] uppercase tracking-[0.15em] flex items-center space-x-1.5">
            <Camera className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Foto Oficial do Casal</span>
          </label>
          <p className="text-[11px] text-[#2D2D2D]/60 font-sans mt-0.5">
            A foto que aparecerá no topo do site e na capa do convite
          </p>
        </div>

        {currentPhotoUrl && (
          <button
            type="button"
            onClick={() => onPhotoChange('')}
            className="text-rose-700 hover:text-rose-900 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remover</span>
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* PHOTO PREVIEW AND UPLOAD TRIGGER ZONE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        {/* Thumbnail Preview */}
        <div className="relative group rounded-2xl overflow-hidden border-2 border-[#C5A059]/40 aspect-[4/3] bg-[#F2ECE4] shadow-xs flex items-center justify-center">
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt="Foto do Casal"
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="text-center p-3 text-[#2D2D2D]/40 space-y-1">
              <ImageIcon className="w-8 h-8 mx-auto text-[#C5A059]" />
              <span className="text-[10px] font-bold uppercase block">Sem foto cadastrada</span>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059]" />
              <span>Processando...</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="sm:col-span-2 space-y-2.5">
          {/* Main Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-[#2D2D2D] hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[#C5A059]" />
            <span>{currentPhotoUrl ? 'Trocar Foto do Aparelho' : 'Subir Foto do Celular / PC'}</span>
          </button>

          {/* Secondary Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex-1 py-2 px-3 bg-white hover:bg-[#F2ECE4] text-[#2D2D2D] border border-[#E5DFD5] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition active:scale-95"
            >
              <LinkIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{showUrlInput ? 'Ocultar URL' : 'Inserir Link de Foto'}</span>
            </button>
          </div>

          {/* Custom URL Input Toggle */}
          {showUrlInput && (
            <form onSubmit={handleApplyUrl} className="flex items-center space-x-2 pt-1">
              <input
                type="url"
                placeholder="Cole a URL da imagem (https://...)"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-[#E5DFD5] bg-white rounded-xl focus:border-[#C5A059] outline-none font-sans"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-white font-bold text-xs rounded-xl transition flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* PRESET GALLERY OPTIONS */}
      <div className="pt-2 border-t border-[#E5DFD5]">
        <span className="text-[10px] font-bold text-[#2D2D2D]/60 uppercase tracking-wider block mb-2">
          Ou escolha uma foto de exemplo elegante:
        </span>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_PHOTOS.map((preset, idx) => {
            const isSelected = currentPhotoUrl === preset.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPhotoChange(preset.url)}
                className={`group relative rounded-xl overflow-hidden border transition-all text-left aspect-[16/10] bg-[#F2ECE4] ${
                  isSelected ? 'ring-2 ring-[#C5A059] border-[#C5A059]' : 'border-[#E5DFD5] hover:border-[#C5A059]'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[9px] font-semibold text-white leading-tight truncate">
                    {preset.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-[#C5A059] text-white p-0.5 rounded-full shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
