import { useRef, useCallback } from 'react';

/**
 * useLUT Hook (High-Performance Hald-8 Version)
 * Optimized for 512x512 Hald CLUT images.
 * Uses colorSpace: 'srgb' to ensure consistent mapping across different displays.
 */
export const useLUT = () => {
  const lutCache = useRef<Map<string, ImageData>>(new Map());

  const loadLUT = useCallback(async (lutUrl: string): Promise<ImageData | null> => {
    if (lutCache.current.has(lutUrl)) return lutCache.current.get(lutUrl)!;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = lutUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      // Force sRGB to prevent browser color management from shifting LUT values
      const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' } as any) as CanvasRenderingContext2D | null;
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      lutCache.current.set(lutUrl, data);
      return data;
    } catch (err) { 
      console.error('Failed to load LUT:', err);
      return null; 
    }
  }, []);

  const applyLUT = useCallback((ctx: CanvasRenderingContext2D, lutData: ImageData, width: number, height: number) => {
    // Ensure we read in sRGB space
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const lut = lutData.data;
    const lutWidth = lutData.width;
    
    // Hald-8 Level: 64x64x64 colors. 
    // We use a slightly more precise scale (255 / 63 = 4.047)
    // Using 4 as a divisor is the standard for Hald-8 (256/64)
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Map 0-255 to 0-63
      // We use floor for a stable lookup, or we could interpolate for "pro" quality.
      // For Hald-8, nearest-neighbor is usually sufficient if the LUT is high-quality.
      const ir = (r * 63) >> 8; // Faster version of Math.floor(r * 63 / 255)
      const ig = (g * 63) >> 8;
      const ib = (b * 63) >> 8;

      // Hald-8 Linear Mapping: Index = R + (G * 64) + (B * 64 * 64)
      const index = ir + (ig << 6) + (ib << 12);

      // Map linear index to LUT image coordinates
      const x = index % lutWidth;
      const y = (index / lutWidth) | 0;

      const lutIdx = (y * lutWidth + x) << 2;

      // Update the pixel with the LUT color
      data[i]     = lut[lutIdx];
      data[i + 1] = lut[lutIdx + 1];
      data[i + 2] = lut[lutIdx + 2];
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  return { loadLUT, applyLUT };
};
