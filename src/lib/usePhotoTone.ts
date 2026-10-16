import { useState, useEffect } from 'react';

/**
 * Extracts the strongest/deepest personalized color tone from the couple's photo
 * to customize the couple logo badge with initials.
 */
export function usePhotoTone(imageUrl?: string): string | null {
  const [tone, setTone] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setTone(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let maxScore = -1;
        let bestColor = '';

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 220 || lum < 25) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          // Score to find deep, rich saturated tone from the photo
          const depthScore = (1 - lum / 255) * 0.45 + sat * 0.55;
          if (depthScore > maxScore) {
            maxScore = depthScore;
            const darkFactor = lum > 100 ? 0.72 : 0.9;
            bestColor = `rgb(${Math.round(r * darkFactor)}, ${Math.round(g * darkFactor)}, ${Math.round(b * darkFactor)})`;
          }
        }

        if (isMounted && bestColor) {
          setTone(bestColor);
        }
      } catch {
        // Fallback gracefully on CORS or canvas errors
      }
    };

    img.src = imageUrl;

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return tone;
}
