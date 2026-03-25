import React, { useState, useRef, useEffect, useCallback } from 'react';
import LottieImport from 'lottie-react';
import { STICKERS } from "../constants/sticker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Lottie = (LottieImport as any).default ?? LottieImport;

const STICKER_CATALOG = STICKERS;

interface PlacedSticker {
  id: string;
  src: string;
  label: string;
  x: number;
  y: number;
  size: number;
  data: object | null;
}

const StickerTestPage: React.FC = () => {
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [log, setLog] = useState<string[]>(['Ready. Click a sticker below to place it.']);
  const lottieCacheRef = useRef<Map<string, object>>(new Map());
  const stripRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);

  const fetchLottieData = useCallback(async (src: string): Promise<object | null> => {
    if (lottieCacheRef.current.has(src)) {
      return lottieCacheRef.current.get(src)!;
    }
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lottieCacheRef.current.set(src, data);
      return data;
    } catch (e) {
      addLog(`❌ Failed: ${(e as Error).message}`);
      return null;
    }
  }, []);

  // Pre-fetch all stickers for the palette
  useEffect(() => {
    const prefetch = async () => {
      addLog('Pre-fetching all stickers…');
      await Promise.all(STICKER_CATALOG.map(cat => fetchLottieData(cat.src)));
      // Force re-render to show cached stickers
      setLog(prev => [`[${new Date().toLocaleTimeString()}] ✅ All stickers loaded`, ...prev.slice(0, 9)]);
    };
    prefetch();
  }, [fetchLottieData]);

  const addSticker = useCallback(async (catalog: typeof STICKER_CATALOG[0]) => {
    addLog(`Adding sticker: ${catalog.label}`);
    const data = await fetchLottieData(catalog.src);
    setPlacedStickers(prev => [...prev, {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      src: catalog.src, label: catalog.label,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 60,
      size: 100, data,
    }]);
  }, [fetchLottieData]);

  const removeSticker = (id: string) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
    addLog('Removed sticker');
  };

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const sticker = placedStickers.find(s => s.id === id);
    if (!sticker) return;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const origX = sticker.x; const origY = sticker.y;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const dx = ((cx - startX) / rect.width) * 100;
      const dy = ((cy - startY) / rect.height) * 100;
      setPlacedStickers(prev => prev.map(s =>
        s.id === id ? { ...s, x: Math.max(0, Math.min(95, origX + dx)), y: Math.max(0, Math.min(95, origY + dy)) } : s
      ));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove as EventListener);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove as EventListener);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('mousemove', onMove as EventListener);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove as EventListener, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [placedStickers]);

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#1E3A5F', marginBottom: 4 }}>🧪 Sticker Test Page</h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>Click a sticker to place it. Drag to move. Double-click or ✕ to remove.</p>

      {/* Photo strip placeholder */}
      <div
        ref={stripRef}
        style={{ position: 'relative', width: '100%', maxWidth: 500, height: 360, margin: '0 auto 24px', background: 'linear-gradient(135deg, #BAE6FD, #FEF9C3)', borderRadius: 20, border: '8px solid white', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '1rem', pointerEvents: 'none' }}>
          📷 Photo strip goes here
        </div>

        {placedStickers.map(s => (
          <div
            key={s.id}
            id={`sticker-${s.id}`}
            style={{
              position: 'absolute',
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              transform: 'translate(-50%, -50%)',
              cursor: 'grab', userSelect: 'none', zIndex: 20,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
            }}
            onMouseDown={e => handleDragStart(e, s.id)}
            onTouchStart={e => handleDragStart(e, s.id)}
            onDoubleClick={() => removeSticker(s.id)}
          >
            {s.data
              ? <Lottie animationData={s.data} loop autoplay style={{ width: '100%', height: '100%' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: 8, fontSize: '0.7rem', color: '#64748B' }}>Loading…</div>
            }
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeSticker(s.id); }}
              style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', fontSize: 14, lineHeight: '22px', textAlign: 'center', padding: 0 }}
            >✕</button>
          </div>
        ))}
      </div>

      {/* Sticker palette */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
        {STICKER_CATALOG.map(cat => (
          <button
            type="button"
            key={cat.src}
            onClick={() => addSticker(cat)}
            style={{ width: 80, height: 80, borderRadius: 16, border: '2px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.65rem', color: '#64748B', padding: 4 }}
          >
            <div style={{ width: 48, height: 48 }}>
              {lottieCacheRef.current.has(cat.src)
                ? <Lottie animationData={lottieCacheRef.current.get(cat.src)!} loop autoplay style={{ width: '100%', height: '100%' }} />
                : <span style={{ fontSize: '2rem', lineHeight: '48px' }}>{cat.label.split(' ')[0]}</span>
              }
            </div>
            <span>{cat.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      {/* Log */}
      <div style={{ maxWidth: 500, margin: '0 auto', background: '#1E293B', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.7rem', margin: '0 0 8px', fontWeight: 700 }}>LOG</p>
        {log.map((l, i) => (
          <div key={i} style={{ color: i === 0 ? '#86EFAC' : '#64748B', fontSize: '0.75rem', marginBottom: 2, fontFamily: 'monospace' }}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export default StickerTestPage;
