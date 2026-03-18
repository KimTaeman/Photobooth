import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

const audioCtx = { current: null as AudioContext | null };

const getAudioCtx = () => {
  if (!audioCtx.current) audioCtx.current = new AudioContext();
  if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
  return audioCtx.current;
};

const playTick = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.09);
};

const playShutter = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
};

interface CameraScreenProps {
  isActive: boolean;
  selectedFrame: string | null;
  onBack: () => void;
  onComplete: (photos: string[], videoBlob: Blob | null) => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({
  isActive,
  selectedFrame,
  onBack,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shotNum, setShotNum] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Get ready and press the button!');
  const [flash, setFlash] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isActive && !stream) {
      startCamera();
    }
    return () => {
      if (!isActive) stopCamera();
    };
  }, [isActive]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      alert('Camera error: ' + (err as Error).message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const startVideoRecording = () => {
    if (!videoRef.current || !stream) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
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
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9'
      : 'video/webm';
    
    const mr = new MediaRecorder(canvasStream, { mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    mr.start(1000);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  };

  const stopVideoRecording = (): Promise<Blob | null> => {
    setIsRecording(false);
    return new Promise((resolve) => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  /**
   * Helper to draw an image to a canvas context using "cover" logic (maintain aspect ratio)
   */
  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLVideoElement, x: number, y: number, w: number, h: number) => {
    const imgWidth = img.videoWidth;
    const imgHeight = img.videoHeight;
    const imgRatio = imgWidth / imgHeight;
    const targetRatio = w / h;
    let sw, sh, sx, sy;

    if (imgRatio > targetRatio) {
      sh = imgHeight;
      sw = imgHeight * targetRatio;
      sx = (imgWidth - sw) / 2;
      sy = 0;
    } else {
      sw = imgWidth;
      sh = imgWidth / targetRatio;
      sx = 0;
      sy = (imgHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const capturePhoto = (): Promise<string> => {
    return new Promise((resolve) => {
      const v = videoRef.current!;
      const canvas = document.createElement('canvas');
      // We'll capture at 3:2 ratio for the slots (840x540)
      // but let's use a higher resolution for the capture itself
      canvas.width = 1260; // 840 * 1.5
      canvas.height = 810; // 540 * 1.5
      const ctx = canvas.getContext('2d')!;
      
      // Mirror the photo result
      ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
      drawImageCover(ctx, v, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      canvas.toBlob((blob) => {
        resolve(URL.createObjectURL(blob!));
      }, 'image/jpeg', 0.92);
    });
  };

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  const startSession = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const photos: string[] = [];

    startVideoRecording();

    for (let i = 1; i <= 4; i++) {
      setShotNum(i);
      setStatus(`Pose! Shot ${i} of 4`);
      
      // Countdown
      for (let count = 3; count > 0; count--) {
        setCountdown(count);
        playTick();
        await new Promise((r) => setTimeout(r, 800));
      }
      setCountdown(null);

      const photoUrl = await capturePhoto();
      photos.push(photoUrl);
      playShutter();
      triggerFlash();

      if (i < 4) await new Promise((r) => setTimeout(r, 1200));
    }

    setStatus('Processing...');
    const videoBlob = await stopVideoRecording();
    onComplete(photos, videoBlob);
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
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`shot-dot ${shotNum > n || (isProcessing && shotNum === 4 && status === 'Processing...') ? 'done' : ''} ${shotNum === n && isProcessing && status !== 'Processing...' ? 'current' : ''}`}
            />
          ))}
        </div>
        <div className="shot-label">Shot {shotNum} / 4</div>
        <div className={`rec-indicator ${isRecording ? 'active' : ''}`}>
          <div className="rec-dot" />
          REC
        </div>
      </div>
      <div className="camera-viewport">
        <div id="video-wrapper">
          {countdown && <div id="countdown-overlay" style={{ display: 'flex' }}>{countdown}</div>}
          <div id="flash-overlay" className={flash ? 'ripple' : ''} />
          <video ref={videoRef} autoPlay playsInline muted />
          {selectedFrame && (
            <img
              id="frame-overlay"
              src={selectedFrame}
              style={{ display: 'block' }}
              alt="Frame Overlay"
            />
          )}
        </div>
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
    </div>
  );
};

export default CameraScreen;
