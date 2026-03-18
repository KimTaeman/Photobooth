import React from 'react';
import { Palette, Camera } from 'lucide-react';
import type { Frame } from '../types';

interface FrameSelectionScreenProps {
  onStartSession: (frame: string) => void;
  isActive: boolean;
  selectedFrame: string | null;
  onSelectFrame: (frame: string) => void;
}

const frames: Frame[] = [
  { id: 'frame1', image: '/frame1.png', label: 'Frame 1' },
  { id: 'frame2', image: '/frame2.png', label: 'Frame 2' },
];

const FrameSelectionScreen: React.FC<FrameSelectionScreenProps> = ({
  onStartSession,
  isActive,
  selectedFrame,
  onSelectFrame,
}) => {
  return (
    <div id="screen-frames" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="frames-header">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><Palette size={30} /> Choose Your Frame</h1>
        <p>Pick a frame for your photo strip!</p>
      </div>
      <div className="frames-grid">
        {frames.map((frame) => (
          <div
            key={frame.id}
            className={`frame-card ${selectedFrame === frame.image ? 'selected' : ''}`}
            onClick={() => onSelectFrame(frame.image)}
          >
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
        onClick={() => selectedFrame && onStartSession(selectedFrame)}
      >
        <Camera size={20} /> Start Photo Session
      </button>
    </div>
  );
};

export default FrameSelectionScreen;
