import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Sparkles, Download, Film, RotateCcw, QrCode, WifiOff } from 'lucide-react';
import { uploadToCloudinary } from '../hooks/useCloudinary';
import { logSession } from '../hooks/useSupabase';
import { useUploadQueue } from '../hooks/useUploadQueue';
import logo from '../assets/logo.png';

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

  const downloadLocalPhoto = () => {
    if (!resultBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(resultBlob);
    a.download = `SummerSplash_PhotoStrip_${Date.now()}.jpg`;
    a.click();
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
  }, [isActive, photos, selectedFrame]);

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
              <div className="result-photo">
                {resultImg && <img src={resultImg} alt="Your photo strip" />}
              </div>
              <div className="print-only print-footer">
                <p>Scan the QR code on your invite to download all your memories</p>
                <p>Save within 24 hours &middot; Summer Splash Photobooth 2026</p>
              </div>
            </div>

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
