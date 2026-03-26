import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Camera } from 'lucide-react';
import logo from '../assets/logo.png';
import type { RemoteConfig } from '../hooks/useSupabase';

interface FrameSelectionScreenProps {
  onStartSession: (frame: string) => void;
  isActive: boolean;
  selectedFrame: string | null;
  onSelectFrame: (frame: string) => void;
  availableFrames?: string[];
  config: RemoteConfig | null;
}

const FrameSelectionScreen: React.FC<FrameSelectionScreenProps> = ({ 
  onStartSession, 
  isActive, 
  selectedFrame, 
  onSelectFrame,
  availableFrames = ['/frame1.png', '/frame2.png', '/frame3.png', '/frame4.png'],
  config
}) => {
  const [isIdle, setIsIdle] = useState(false);
  const [isSplashing, setIsSplashing] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = availableFrames.map((f, i) => ({
    id: `frame_${i}`,
    image: f,
    label: `Frame ${i + 1}`
  }));

  const [splashes, setSplashes] = useState<{ id: number; x: number; y: number }[]>([]);
  const splashIdRef = useRef(0);

  const resetIdleTimer = useCallback(() => {
    // console.log('Resetting idle timer');
    setIsIdle(false);
    setIsSplashing(false);
    setSplashes([]);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      // console.log('Idle screen active');
      setIsIdle(true);
    }, 30000);
  }, []);

  const handleIdleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const charX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const charY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const newSplash = { id: splashIdRef.current++, x: charX, y: charY };
    setSplashes(prev => [...prev, newSplash]);
    setIsSplashing(true);

    // Remove splash after animation
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== newSplash.id));
    }, 800);

    // Transition to main screen after a short delay if it's the first tap or after animation
    setTimeout(() => {
      resetIdleTimer();
    }, 600);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isActive) { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); setIsIdle(false); setIsSplashing(false); return; }
    resetIdleTimer();
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'] as const;
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [isActive, resetIdleTimer]);

  const handleStartClick = () => {
    if (selectedFrame) onStartSession(selectedFrame);
  };

  return (
    <div id="screen-frames" className={`screen ${isActive ? 'active' : ''}`} style={{ overflowY: isIdle ? 'hidden' : 'auto' }}>
      <div className="frames-header">
        <img src={logo} alt="Tatt n' Snap" style={{ height: '70px', objectFit: 'contain', marginBottom: '4px' }} />
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><Palette size={30} /> Choose Your Frame</h1>
        <p>Pick a frame for your photo strip!</p>
      </div>
      <div className="frames-grid">
        {frames.map(frame => (
          <div key={frame.id} className={`frame-card ${selectedFrame === frame.image ? 'selected' : ''}`} onClick={() => onSelectFrame(frame.image)}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '2480 / 1748' }}>
              <img src={frame.image} alt={frame.label} style={{ width: '100%', display: 'block' }} />
              {frame.image === '/frame4.png' && (
                <img 
                  src="/frame4-transparent.png" 
                  alt={`${frame.label} Overlay`} 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%', 
                    zIndex: 2, 
                    pointerEvents: 'none' 
                  }} 
                />
              )}
            </div>
            <div className="check">✓</div>
            <div className="frame-label">{frame.label}</div>
          </div>
        ))}
      </div>
      <button 
        className={`btn btn-primary btn-lg ${selectedFrame ? 'ready' : ''}`} 
        id="btn-start-session" 
        disabled={!selectedFrame} 
        onClick={handleStartClick}
      >
        <Camera size={20} /> Start Photo Session
      </button>

      {config?.enablePdpa && (
        <div style={{ marginTop: 'auto', padding: '30px 20px', textAlign: 'center', width: '100%', maxWidth: '600px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '6px' }}>{config.pdpaTextTh}</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>{config.pdpaTextEn}</p>
          <p style={{ marginTop: '12px', fontWeight: 700, color: 'var(--blue)' }}>* รูปภาพของคุณจะถูกลบอัตโนมัติภายใน 24 ชั่วโมง / Your photos will be automatically deleted after 24 hours</p>
        </div>
      )}

      {isIdle && (
        <div className={`idle-overlay ${isSplashing ? 'splashing' : ''}`} onClick={handleIdleTap}>
          {config?.theme === 'cute' ? (
            <>
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  backgroundImage: 'url("/background.png")', 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  opacity: 0.4,
                  zIndex: 0
                }} 
              />
              <div className="idle-blob idle-blob-1" />
              <div className="idle-blob idle-blob-2" />
              <div className="idle-blob idle-blob-3" />
              <div className="idle-content">
                <div className="idle-logo-container">
                  <img src={logo} alt="Logo" className="idle-logo" />
                </div>
                <h2 className="idle-title">Tap to<br />Start!</h2>
                <p className="idle-subtitle">Summer Splash Photobooth</p>
                <div className="idle-dots">
                  <span /><span /><span />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="idle-illustration illustration-tl">
                <img src="/cam.png" alt="Camera Drawing" />
              </div>
              <div className="idle-illustration illustration-br">
                <img src="/tatt.png" alt="Tattoo Drawing" />
              </div>
              <div className="idle-content">
                <div className="idle-logo-container">
                  <img src={logo} alt="Logo" className="idle-logo" />
                </div>
                <div className="idle-title-image">
                  <img src="/taptostart.png" alt="Tap to Start" />
                </div>
                <p className="idle-subtitle"></p>
                <div className="idle-dots">
                  <span /><span /><span />
                </div>
              </div>
            </>
          )}
          {splashes.map(s => (
            <div 
              key={s.id} 
              className="water-splash-effect" 
              style={{ left: s.x, top: s.y }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FrameSelectionScreen;
