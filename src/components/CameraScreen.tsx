import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, RotateCcw, Check } from 'lucide-react';

const audioCtx = { current: null as AudioContext | null };
const getAudioCtx = () => {
  if (!audioCtx.current) audioCtx.current = new AudioContext();
  if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
  return audioCtx.current;
};
const playTick = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = 880; osc.type = 'sine';
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.09);
};
const playShutter = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
};
interface CameraScreenProps {
  isActive: boolean;
  selectedFrame: string | null;
  onBack: () => void;
  onComplete: (photos: string[], videoBlob: Blob | null, bursts: string[][]) => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ isActive, selectedFrame, onBack, onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shotNum, setShotNum] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Get ready and press the button!');
  const [flash, setFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewCountdown, setPreviewCountdown] = useState(3);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const retakeResolveRef = useRef<((d: 'keep' | 'retake') => void) | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) { alert('Camera error: ' + (err as Error).message); }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  };

  useEffect(() => {
    if (isActive && !stream) startCamera();
    return () => { if (!isActive) stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const startVideoRecording = () => {
    if (!videoRef.current || !stream) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280; const h = v.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    recordCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;
    const drawFrame = () => {
      ctx.setTransform(-1, 0, 0, 1, w, 0);
      ctx.drawImage(v, 0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();
    const canvasStream = canvas.captureStream(30);
    videoChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm';
    const mr = new MediaRecorder(canvasStream, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  };

  const stopVideoRecording = (): Promise<Blob | null> => {
    setIsRecording(false);
    return new Promise(resolve => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') { resolve(null); return; }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLVideoElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.videoWidth / img.videoHeight;
    const targetRatio = w / h;
    let sw, sh, sx, sy;
    if (imgRatio > targetRatio) { sh = img.videoHeight; sw = sh * targetRatio; sx = (img.videoWidth - sw) / 2; sy = 0; }
    else { sw = img.videoWidth; sh = sw / targetRatio; sx = 0; sy = (img.videoHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const capturePhoto = (): Promise<string> => {
    return new Promise(resolve => {
      const v = videoRef.current!;
      const canvas = document.createElement('canvas');
      canvas.width = 1277; canvas.height = 685;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
      drawImageCover(ctx, v, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/jpeg', 0.92);
    });
  };

  const captureFrameBurst = async (count = 5, intervalMs = 80): Promise<string[]> => {
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const url = await new Promise<string>(resolve => {
        const v = videoRef.current!;
        const canvas = document.createElement('canvas');
        canvas.width = 1277; canvas.height = 685;
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
        drawImageCover(ctx, v, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        canvas.toBlob(blob => resolve(URL.createObjectURL(blob!)), 'image/jpeg', 0.7);
      });
      frames.push(url);
      if (i < count - 1) await new Promise(r => setTimeout(r, intervalMs));
    }
    return frames;
  };

  const triggerFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 600); };

  const waitForRetakeDecision = (): Promise<'keep' | 'retake'> =>
    new Promise(resolve => {
      retakeResolveRef.current = resolve;
      let c = 3;
      setPreviewCountdown(c);
      previewTimerRef.current = setInterval(() => {
        c--;
        if (c <= 0) {
          clearInterval(previewTimerRef.current!);
          retakeResolveRef.current = null;
          setPreviewPhoto(null);
          resolve('keep');
        } else { setPreviewCountdown(c); }
      }, 1000);
    });

  const handleKeep = () => {
    clearInterval(previewTimerRef.current!);
    retakeResolveRef.current?.('keep');
    retakeResolveRef.current = null;
    setPreviewPhoto(null);
  };

  const handleRetake = () => {
    clearInterval(previewTimerRef.current!);
    retakeResolveRef.current?.('retake');
    retakeResolveRef.current = null;
    setPreviewPhoto(null);
  };

  const startSession = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCapturedPhotos([]);
    const photos: string[] = [];
    const bursts: string[][] = [];
    startVideoRecording();

    for (let i = 1; i <= 4; i++) {
      setShotNum(i);
      let decision: 'keep' | 'retake' = 'retake';
      let photoUrl = '';
      let burst: string[] = [];

      while (decision === 'retake') {
        setStatus(`Pose! Shot ${i} of 4`);
        for (let count = 3; count > 0; count--) {
          setCountdown(count); playTick();
          await new Promise(r => setTimeout(r, 800));
        }
        setCountdown(null);
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        burst.forEach(u => URL.revokeObjectURL(u));
        burst = await captureFrameBurst();
        photoUrl = await capturePhoto();
        playShutter(); triggerFlash();
        setPreviewPhoto(photoUrl);
        decision = await waitForRetakeDecision();
      }

      photos.push(photoUrl);
      bursts.push(burst);
      setCapturedPhotos(prev => [...prev, photoUrl]);
      if (i < 4) await new Promise(r => setTimeout(r, 600));
    }

    setStatus('Processing...');
    const videoBlob = await stopVideoRecording();
    onComplete(photos, videoBlob, bursts);
    setIsProcessing(false);
    setShotNum(1);
  };

  return (
    <div id="screen-camera" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="camera-topbar">
        <button className="btn-back" onClick={onBack} disabled={isProcessing} title="Back to frames">
          <ChevronLeft size={20} />
        </button>
        <div className="shot-indicators">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`shot-dot ${shotNum > n || (isProcessing && shotNum === 4 && status === 'Processing...') ? 'done' : ''} ${shotNum === n && isProcessing && status !== 'Processing...' ? 'current' : ''}`} />
          ))}
        </div>
        <div className="shot-label">Shot {shotNum} / 4</div>
        <div className={`rec-indicator ${isRecording ? 'active' : ''}`}>
          <div className="rec-dot" /> REC
        </div>
      </div>
      <div className="camera-viewport">
        <div id="video-wrapper">
          {countdown && <div id="countdown-overlay" style={{ display: 'flex' }}>{countdown}</div>}
          <div id="flash-overlay" className={flash ? 'ripple' : ''} />
          <video ref={videoRef} autoPlay playsInline muted />
          {selectedFrame && <img id="frame-overlay" src={selectedFrame} style={{ display: 'block' }} alt="Frame Overlay" />}
        </div>
      </div>
      <div className="preview-strip">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`preview-slot${capturedPhotos[i] ? ' filled' : ''}${shotNum === i + 1 && isProcessing && !capturedPhotos[i] ? ' current' : ''}`}>
            {capturedPhotos[i] && <img src={capturedPhotos[i]} alt={`Shot ${i + 1}`} />}
          </div>
        ))}
      </div>
      <div className="camera-bottom">
        <div id="camera-status">{status}</div>
        <button className="shutter-btn" onClick={startSession} disabled={isProcessing}>
          <svg className="shutter-icon" viewBox="0 0 24 24">
            <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
            <path d="M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" />
          </svg>
        </button>
      </div>
      {previewPhoto && (
        <div className="retake-overlay">
          <img src={previewPhoto} className="retake-preview" alt="Preview" />
          <div className="retake-actions">
            <button className="btn btn-outline retake-btn" onClick={handleRetake}><RotateCcw size={18} /> Retake</button>
            <button className="btn btn-primary retake-btn" onClick={handleKeep}><Check size={18} /> Keep ({previewCountdown})</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraScreen;
