import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import LottieImport from 'lottie-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Lottie = (LottieImport as any).default ?? LottieImport;
import { Sparkles, Download, Film, RotateCcw, QrCode, WifiOff, Sticker, Trash2 } from 'lucide-react';
import { uploadToCloudinary } from '../hooks/useCloudinary';
import { logSession } from '../hooks/useSupabase';
import { useUploadQueue } from '../hooks/useUploadQueue';
import logo from '../assets/logo.png';
import { STICKERS } from "../constants/sticker";

// Free Lottie animations from lottiefiles.com — swap any URL with another from lottiefiles.com/featured
const STICKER_CATALOG = STICKERS;

interface PlacedSticker {
  id: string;
  src: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
  size: number; // px in display space
  data: object | null; // fetched lottie JSON
}

interface ResultScreenProps {
  isActive: boolean;
  photos: string[];
  photosBursts?: string[][];
  videoBlob: Blob | null;
  selectedFrame: string | null;
  onNewSession: () => void;
  config: import('../hooks/useSupabase').RemoteConfig | null;
}

const ResultScreen: React.FC<ResultScreenProps> = ({
  isActive,
  photos,
  photosBursts,
  videoBlob,
  selectedFrame,
  onNewSession,
  config,
}) => {
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [downloadPageUrl, setDownloadPageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToQueue, pendingCount } = useUploadQueue();

  // --- Sticker state ---
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [isStickersLoaded, setIsStickersLoaded] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const lottieCacheRef = useRef<Map<string, object>>(new Map());

  const fetchLottieData = useCallback(async (src: string): Promise<object | null> => {
    if (lottieCacheRef.current.has(src)) return lottieCacheRef.current.get(src)!;
    try {
      const res = await fetch(src);
      const data = await res.json();
      lottieCacheRef.current.set(src, data);
      return data;
    } catch { return null; }
  }, []);

  // Pre-fetch stickers when the screen becomes active
  useEffect(() => {
    if (isActive && !isStickersLoaded) {
      const prefetch = async () => {
        await Promise.all(STICKER_CATALOG.map(cat => fetchLottieData(cat.src)));
        setIsStickersLoaded(true);
      };
      prefetch();
    }
  }, [isActive, isStickersLoaded, fetchLottieData]);

  const addSticker = useCallback(async (catalog: typeof STICKER_CATALOG[0]) => {
    const data = await fetchLottieData(catalog.src);
    setPlacedStickers(prev => [...prev, {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      src: catalog.src, label: catalog.label,
      x: 40 + Math.random() * 20, y: 40 + Math.random() * 20,
      size: 120, data,
    }]);
  }, [fetchLottieData]);

  const removeSticker = useCallback((id: string) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleStickerDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
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
      const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
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

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sw, sh, sx, sy;
    if (imgRatio > targetRatio) {
      sh = img.height; sw = img.height * targetRatio; sx = (img.width - sw) / 2; sy = 0;
    } else {
      sw = img.width; sh = img.width / targetRatio; sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
      else { videoRef.current.pause(); setIsPlaying(false); }
    }
  };

  const generateGif = async (photoUrls: string[], frameUrl: string, bursts?: string[][]): Promise<Blob> => {
    const { createGIF } = await import('gifshot');
    // Strip layout: A5 landscape (2480x1748) scaled down to 860x606 for GIF
    const w = 860, h = 606;
    const ratio = w / 2480;
    
    const layout = (selectedFrame && config?.frameLayouts?.[selectedFrame]) || config?.layout2x2 || { margin: 60, gutterX: 40, gutterY: 40, slotW: 1160, slotH: 794 };
    const slotW = layout.slotW * ratio;
    const slotH = layout.slotH * ratio;
    const margin = layout.margin * ratio;
    const gX = layout.gutterX * ratio;
    const gY = layout.gutterY * ratio;

    const coords = [
      { x: margin, y: margin }, 
      { x: margin + slotW + gX, y: margin },
      { x: margin, y: margin + slotH + gY }, 
      { x: margin + slotW + gX, y: margin + slotH + gY },
    ];
    const frameImg = await loadImage(frameUrl);

    let frames: string[];

    if (bursts && bursts.length === 4 && bursts[0]?.length > 0) {
      // Action GIF: each slot animates through its burst frames simultaneously
      const burstLen = bursts[0].length;
      const burstImgs = await Promise.all(bursts.map(burst => Promise.all(burst.map(loadImage))));
      frames = [];
      for (let fi = 0; fi < burstLen; fi++) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        
        // Draw frame first
        ctx.filter = 'none';
        ctx.drawImage(frameImg, 0, 0, w, h);

        for (let si = 0; si < 4; si++) {
          const img = burstImgs[si]?.[fi] ?? burstImgs[si]?.[burstImgs[si].length - 1];
          if (img) {
            ctx.filter = 'none';
            drawImageCover(ctx, img, coords[si].x, coords[si].y, slotW, slotH);
          }
        }
        frames.push(c.toDataURL('image/jpeg', 0.82));
      }
      // Hold last frame
      frames.push(frames[frames.length - 1], frames[frames.length - 1]);
    } else {
      // Fallback: progressive reveal with static photos
      const photoImgs = await Promise.all(photoUrls.map(loadImage));
      frames = [];
      for (let i = 0; i < 4; i++) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Draw frame first
        ctx.filter = 'none';
        ctx.drawImage(frameImg, 0, 0, w, h);

        for (let j = 0; j <= i; j++) {
          ctx.filter = 'none';
          drawImageCover(ctx, photoImgs[j], coords[j].x, coords[j].y, slotW, slotH);
        }
        frames.push(c.toDataURL('image/jpeg', 0.85));
      }
      frames.push(frames[3], frames[3]);
    }

    return new Promise((resolve, reject) => {
      createGIF(
        { images: frames, gifWidth: w, gifHeight: h, interval: bursts ? 0.12 : 0.5 },
        (obj) => {
          if (obj.error) { reject(new Error(obj.errorMsg || 'GIF generation failed')); return; }
          fetch(obj.image).then(r => r.blob()).then(resolve).catch(reject);
        }
      );
    });
  };

  const processAndUpload = async () => {
    const sessionId = `session_${Date.now()}`;
    let hasVideo = !!videoBlob;

    try {
      setUploadStatus('Processing memories...');
      setIsOfflineMode(false);
      
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (videoBlob) setVideoPreviewUrl(URL.createObjectURL(videoBlob));

      // 1. Create Final Photo Strip
      const canvas = document.createElement('canvas');
      canvas.width = 2480; canvas.height = 1748;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 2480, 1748);

      // Draw frame first as background
      ctx.save();
      ctx.filter = 'none';
      ctx.globalAlpha = 1.0;
      const frameImg = await loadImage(selectedFrame!);
      ctx.drawImage(frameImg, 0, 0, 2480, 1748);
      ctx.restore();

      const layout = (selectedFrame && config?.frameLayouts?.[selectedFrame]) || config?.layout2x2 || { margin: 60, gutterX: 40, gutterY: 40, slotW: 1160, slotH: 794 };
      const { margin, gutterX, gutterY, slotW, slotH } = layout;
      const coords = [
        { x: margin, y: margin }, 
        { x: margin + slotW + gutterX, y: margin },
        { x: margin, y: margin + slotH + gutterY }, 
        { x: margin + slotW + gutterX, y: margin + slotH + gutterY }
      ];

      const photoImgs = await Promise.all(photos.map(loadImage));
      photoImgs.forEach((img, i) => {
        ctx.save();
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
        drawImageCover(ctx, img, coords[i].x, coords[i].y, slotW, slotH);
        ctx.restore();
      });

      const finalPhotoBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
      );

      setResultImg(URL.createObjectURL(finalPhotoBlob));
      setResultBlob(finalPhotoBlob);

      // Generate GIF clip
      setUploadStatus('Generating GIF clip...');
      const gifBlob = await generateGif(photos, selectedFrame!, photosBursts);

      // 2-5. Upload everything
      const uploadTasks = [
        // Individual shots
        ...photos.map(async (pUrl, i) => {
          const response = await fetch(pUrl);
          const blob = await response.blob();
          try {
            await uploadToCloudinary(blob, 'image', `${sessionId}_shot_${i + 1}`);
          } catch (e) {
            await addToQueue(blob, 'image', `${sessionId}_shot_${i + 1}`, sessionId);
          }
        }),
        // Final strip
        (async () => {
          try {
            await uploadToCloudinary(finalPhotoBlob, 'image', `${sessionId}_final`);
            await logSession(sessionId, selectedFrame, hasVideo);
          } catch (e) {
            await addToQueue(finalPhotoBlob, 'image', `${sessionId}_final`, sessionId, { frame: selectedFrame, hasVideo });
            setIsOfflineMode(true);
          }
        })(),
        // GIF clip
        (async () => {
          try {
            await uploadToCloudinary(gifBlob, 'image', `${sessionId}_clip`);
          } catch (e) {
            await addToQueue(gifBlob, 'image', `${sessionId}_clip`, sessionId);
          }
        })()
      ];

      if (videoBlob) {
        uploadTasks.push((async () => {
          try {
            await uploadToCloudinary(videoBlob, 'video', `${sessionId}_video`);
          } catch (e) {
            await addToQueue(videoBlob, 'video', `${sessionId}_video`, sessionId);
          }
        })());
      }

      setUploadStatus('Uploading memories...');
      await Promise.all(uploadTasks);

      // 7. Generate QR code
      setUploadStatus('Generating sharing link...');
      const shareUrl = `https://photobooth-teal-pi.vercel.app/#/summer-splash?id=${sessionId}${hasVideo ? '&v=1' : ''}&g=1`;
      setDownloadPageUrl(shareUrl);

      if (qrRef.current) {
        QRCode.toCanvas(qrRef.current, shareUrl, {
          width: 240, margin: 1,
          color: { dark: '#1E3A5F', light: '#ffffff' }
        });
      }

      setUploadStatus(null);
    } catch (err) {
      console.error('Processing/Upload failed:', err);
      setUploadStatus('Processing failed. Please try again.');
    }
  };

  const downloadLocalPhoto = async () => {
    if (!resultBlob) return;

    if (placedStickers.length === 0) {
      // No stickers — fast path
      const a = document.createElement('a');
      a.href = URL.createObjectURL(resultBlob);
      a.download = `SummerSplash_PhotoStrip_${Date.now()}.jpg`;
      a.click();
      return;
    }

    // Bake stickers into the full-res canvas
    const strip = stripRef.current;
    const stripRect = strip?.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = 2480; canvas.height = 1748;
    const ctx = canvas.getContext('2d')!;
    const baseImg = await loadImage(URL.createObjectURL(resultBlob));
    ctx.drawImage(baseImg, 0, 0, 2480, 1748);

    for (const sticker of placedStickers) {
      // Find the rendered Lottie SVG element in the DOM
      const stickerEl = document.getElementById(`sticker-${sticker.id}`);
      const svgEl = stickerEl?.querySelector('svg');
      if (!svgEl || !stripRect) continue;

      const clone = svgEl.cloneNode(true) as SVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));

      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          const scale = 2480 / stripRect.width;
          const sw = sticker.size * scale;
          const sh = sticker.size * scale;
          const px = (sticker.x / 100) * 2480 - sw / 2;
          const py = (sticker.y / 100) * 1748 - sh / 2;
          ctx.drawImage(img, px, py, sw, sh);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve(); };
        img.src = svgUrl;
      });
    }

    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `SummerSplash_PhotoStrip_${Date.now()}.jpg`;
      a.click();
    }, 'image/jpeg', 0.95);
  };

  const downloadLocalVideo = () => {
    if (!videoBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(videoBlob);
    a.download = `SummerSplash_Video_${Date.now()}.webm`;
    a.click();
  };

  useEffect(() => {
    if (isActive && photos.length === 4 && selectedFrame) {
      processAndUpload();
    } else if (!isActive) {
      setVideoPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setIsPlaying(false);
    }
  // processAndUpload is stable for the lifetime of a session — intentionally omitted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, photos, selectedFrame, config]);

  return (
    <div id="screen-result" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="result-content">
        <div className="result-header">
          <img src={logo} alt="Tatt n' Snap" style={{ height: '70px', objectFit: 'contain', marginTop: '-12px', marginBottom: '2px' }} />
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Sparkles size={32} /> Your Photobooth Memories!</h1>
          <p>Scan the QR code to access all your photos and videos</p>
          
          {(isOfflineMode || pendingCount > 0) && (
            <div className="offline-badge" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(234, 88, 12, 0.1)', 
              color: '#ea580c',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginTop: '8px'
            }}>
              <WifiOff size={16} /> 
              {isOfflineMode ? 'Saved locally (Offline)' : `${pendingCount} uploads pending...`}
            </div>
          )}
        </div>

        <div className="result-main">
          <div className="result-left" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="print-area" style={{margin: 'auto'}}>
              <div className="print-only print-header">
                <p className="print-title">Summer Splash 2026</p>
                <p className="print-subtitle">Photobooth Memories</p>
              </div>
              <div className="result-photo" ref={stripRef} style={{ position: 'relative', display: 'inline-block' }}>
                {resultImg && <img src={resultImg} alt="Your photo strip" style={{ display: 'block' }} />}
                {/* Draggable Lottie sticker overlays */}
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
                    onMouseDown={e => handleStickerDragStart(e, s.id)}
                    onTouchStart={e => handleStickerDragStart(e, s.id)}
                    onDoubleClick={() => removeSticker(s.id)}
                  >
                    {s.data
                      ? <Lottie animationData={s.data} loop autoplay style={{ width: '100%', height: '100%' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#999' }}>…</div>
                    }
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeSticker(s.id); }}
                      style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 10 }}
                    ><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
              <div className="print-only print-footer">
                <p>Scan the QR code on your invite to download all your memories</p>
                <p>Save within 24 hours &middot; Summer Splash Photobooth 2026</p>
              </div>
            </div>

            {/* Sticker panel */}
            {resultImg && config?.enableStickers && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowStickerPanel(p => !p)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '50px', border: '2px solid #BAE6FD', background: showStickerPanel ? '#EFF6FF' : 'transparent', color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  <Sticker size={18} /> {showStickerPanel ? 'Hide Stickers' : '✨ Add Stickers'}
                </button>

                {showStickerPanel && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', padding: '16px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <p style={{ width: '100%', margin: '0 0 8px', fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'Fredoka, sans-serif' }}>Tap to place · Drag to move · ✕ to remove</p>
                    {STICKER_CATALOG.map(cat => (
                      <button
                        type="button"
                        key={cat.src}
                        onClick={() => addSticker(cat)}
                        style={{ width: 72, height: 72, borderRadius: '16px', border: '2px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.6rem', color: '#64748B', fontFamily: 'Fredoka, sans-serif', padding: '4px', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#3B82F6')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                      >
                        <div style={{ width: 44, height: 44 }}>
                          {lottieCacheRef.current.has(cat.src)
                            ? <Lottie animationData={lottieCacheRef.current.get(cat.src)!} loop autoplay style={{ width: '100%', height: '100%' }} />
                            : <span style={{ fontSize: '1.6rem', lineHeight: '44px' }}>{cat.label.split(' ')[0]}</span>
                          }
                        </div>
                        <span>{cat.label.split(' ').slice(1).join(' ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {videoPreviewUrl && (
              <div className="result-video" style={{ position: 'relative', cursor: 'pointer', margin:'auto', marginTop: 0 }} onClick={togglePlay}>
                <video ref={videoRef} src={videoPreviewUrl} playsInline onEnded={() => setIsPlaying(false)} style={{ transform: 'scaleX(1)' }} />
                {!isPlaying && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#3B82F6"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="qr-section glass-card" style={{ display: downloadPageUrl ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center' , margin: 'auto'}}>
            <p style={{ fontWeight: 700, color: '#1E3A5F', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><QrCode size={18} /> Scan for All Memories</p>
            <div className="qr-box"><canvas ref={qrRef} /></div>
            {downloadPageUrl && (
              <a 
                href={downloadPageUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  marginTop: '12px', 
                  color: '#3B82F6', 
                  fontSize: '0.9rem', 
                  wordBreak: 'break-all', 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  fontWeight: 600,
                  maxWidth: '100%',
                  padding: '0 10px'
                }}
              >
                {downloadPageUrl}
              </a>
            )}
            <p className="expiry-note">Save within 24 hours — files expire after that!</p>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn btn-primary btn-lg" onClick={downloadLocalPhoto}><Download size={20} /> Save Photo Strip</button>
          {videoBlob && (
            <button className="btn btn-blue btn-lg" onClick={downloadLocalVideo}><Film size={20} /> Save Video</button>
          )}
          <button className="btn btn-outline btn-lg" onClick={onNewSession}><RotateCcw size={20} /> New Session</button>
        </div>
      </div>

      {uploadStatus && (
        <div className="upload-overlay active">
          <img src={logo} alt="Tatt n' Snap" className="upload-overlay-logo" />
          <div className="photo-developing-strip">
            {(['-4deg', '2deg', '-2deg', '3deg'] as const).map((tilt, i) => (
              <div key={i} className="polaroid-frame" style={{ '--tilt': tilt } as React.CSSProperties}>
                <div className="polaroid-inner" />
              </div>
            ))}
          </div>
          <p className="upload-status-text">
            <span className="upload-dot" />
            <span className="upload-dot" />
            <span className="upload-dot" />
            &nbsp;{uploadStatus}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultScreen;
