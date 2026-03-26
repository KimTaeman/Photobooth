import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Camera, Sun } from 'lucide-react';
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
  availableFrames = ['/frame1.png', '/frame2.png', '/frame3.png'],
  config
}) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = availableFrames.map((f, i) => ({
    id: `frame_${i}`,
    image: f,
    label: `Frame ${i + 1}`
  }));

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 30000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isActive) { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); setIsIdle(false); return; }
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
            <img src={frame.image} alt={frame.label} />
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
        <div className="idle-overlay" onClick={resetIdleTimer}>
          <div className="idle-blob idle-blob-1" />
          <div className="idle-blob idle-blob-2" />
          <div className="idle-blob idle-blob-3" />
          <div className="idle-content">
            <div className="idle-sun"><Sun size={72} strokeWidth={1.5} /></div>
            <h2 className="idle-title">Tap to Start!</h2>
            <p className="idle-subtitle">Create your Tatt n' Snap memories</p>
            <div className="idle-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameSelectionScreen;
