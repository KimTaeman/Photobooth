import React, { useState } from 'react';
import { LockOpen } from 'lucide-react';
import { PASSWORD_HASH, sha256 } from '../hooks/useSupabase';

interface LockScreenProps {
  onUnlock: () => void;
  isActive: boolean;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, isActive }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleUnlock = async () => {
    const hash = await sha256(password);
    if (hash === PASSWORD_HASH) {
      onUnlock();
    } else {
      setError('Incorrect password');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 400);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div id="screen-lock" className={`screen ${isActive ? 'active' : ''}`}>
      <div className="lock-card glass-card">
        <svg className="lock-splash-icon" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="24" fill="#BAE6FD" />
          <ellipse cx="30" cy="28" rx="9" ry="14" transform="rotate(-30 30 28)" fill="#BAE6FD" />
          <ellipse cx="72" cy="24" rx="7" ry="12" transform="rotate(25 72 24)" fill="#BAE6FD" />
          <ellipse cx="76" cy="68" rx="8" ry="13" transform="rotate(35 76 68)" fill="#BAE6FD" />
          <ellipse cx="24" cy="72" rx="7" ry="11" transform="rotate(-25 24 72)" fill="#BAE6FD" />
          <circle cx="50" cy="12" r="6" fill="#60A5FA" />
          <circle cx="12" cy="50" r="5" fill="#60A5FA" />
          <circle cx="88" cy="44" r="5" fill="#60A5FA" />
          <circle cx="50" cy="88" r="5" fill="#60A5FA" />
          <circle cx="50" cy="50" r="12" fill="rgba(255,255,255,0.4)" />
        </svg>
        <h1>Photobooth</h1>
        <p>Enter password to unlock the booth</p>
        <input
          type="password"
          className={`lock-input ${shake ? 'shake' : ''}`}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="lock-error">{error}</div>
        <button className="btn btn-primary btn-block" onClick={handleUnlock}>
          <LockOpen size={18} /> Unlock
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
