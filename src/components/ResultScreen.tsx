import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Sparkles, Download, Film, RotateCcw, QrCode } from 'lucide-react';
import { uploadToCloudinary } from '../hooks/useCloudinary';

interface ResultScreenProps {
  isActive: boolean;
  photos: string[];
  videoBlob: Blob | null;
  selectedFrame: string | null;
  onNewSession: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({
  isActive,
  photos,
  videoBlob,
  selectedFrame,
  onNewSession,
}) => {
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [downloadPageUrl, setDownloadPageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive && photos.length === 4 && selectedFrame) {
      processAndUpload();
    } else if (!isActive) {
      // Cleanup when screen is hidden
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
      setIsPlaying(false);
    }
  }, [isActive, photos, selectedFrame]);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  /**
   * Helper to draw an image to a canvas context using "cover" logic (maintain aspect ratio)
   */
  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sw, sh, sx, sy;

    if (imgRatio > targetRatio) {
      sh = img.height;
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / targetRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const processAndUpload = async () => {
    try {
      setUploadStatus('Processing memories...');
      
      // Clear old preview
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      
      if (videoBlob) {
        setVideoPreviewUrl(URL.createObjectURL(videoBlob));
      }

      // 1. Create Final Photo Strip
      const canvas = document.createElement('canvas');
      canvas.width = 1800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1800, 1200);

      // Using perfectly symmetrical coordinates
      // 1800 total = 45 (L) + 835 (Slot) + 40 (Gap) + 835 (Slot) + 45 (R)
      // 1200 total = 45 (T) + 535 (Slot) + 40 (Gap) + 535 (Slot) + 45 (B)
      const slotW = 835;
      const slotH = 535;
      const coords = [
        { x: 45, y: 45 }, { x: 920, y: 45 },
        { x: 45, y: 620 }, { x: 920, y: 620 }
      ];

      const photoImgs = await Promise.all(photos.map(loadImage));
      photoImgs.forEach((img, i) => {
        drawImageCover(ctx, img, coords[i].x, coords[i].y, slotW, slotH);
      });

      const frameImg = await loadImage(selectedFrame!);
      ctx.drawImage(frameImg, 0, 0, 1800, 1200);

      const finalPhotoBlob = await new Promise<Blob>((resolve) => 
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92)
      );
      
      setResultImg(URL.createObjectURL(finalPhotoBlob));
      setResultBlob(finalPhotoBlob);

      setUploadStatus('Uploading individual shots...');
      const sessionId = `session_${Date.now()}`;
      
      // 2. Upload Individual Shots
      await Promise.all(photos.map(async (pUrl, i) => {
        const response = await fetch(pUrl);
        const blob = await response.blob();
        await uploadToCloudinary(blob, 'image', `${sessionId}_shot_${i+1}`);
      }));

      // 3. Upload Final Photo Strip
      setUploadStatus('Uploading final photo strip...');
      await uploadToCloudinary(finalPhotoBlob, 'image', `${sessionId}_final`);

      // 4. Upload Video
      let hasVideo = false;
      if (videoBlob) {
        setUploadStatus('Uploading video...');
        await uploadToCloudinary(videoBlob, 'video', `${sessionId}_video`);
        hasVideo = true;
      }

      // 5. Generate QR Code for the Summer Splash Page
      setUploadStatus('Generating sharing link...');
      
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/summer-splash?id=${sessionId}${hasVideo ? '&v=1' : ''}`;

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
      setUploadStatus('Upload failed. Please try again.');
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

  return (
    <div id="screen-result" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="result-content">
        <div className="result-header">
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Sparkles size={32} /> Your Photobooth Memories!</h1>
          <p>Scan the QR code to access all your photos and videos</p>
        </div>
        
        <div className="result-photo">
          {resultImg && <img src={resultImg} alt="Your photo strip" />}
        </div>

        {videoPreviewUrl && (
          <div className="result-video" style={{ position: 'relative', cursor: 'pointer' }} onClick={togglePlay}>
            <video ref={videoRef} src={videoPreviewUrl} playsInline onEnded={() => setIsPlaying(false)} />
            {!isPlaying && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.2)', transition: 'opacity 0.3s'
              }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#3B82F6">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="qr-section glass-card" style={{ display: downloadPageUrl ? 'block' : 'none' }}>
          <p style={{ fontWeight: 700, color: '#1E3A5F', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><QrCode size={18} /> Scan for All Memories</p>
          <div className="qr-box">
            <canvas ref={qrRef} />
          </div>
          <p className="expiry-note">Download individual shots, video & final strip!</p>
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
          <div className="spinner" />
          <p>{uploadStatus}</p>
        </div>
      )}
    </div>
  );
};

export default ResultScreen;
