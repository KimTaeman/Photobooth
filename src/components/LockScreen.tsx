import React, { useState } from 'react';
import { LockOpen, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PASSWORD_HASH, sha256 } from '../hooks/useSupabase';
import logo from '../assets/logo.png';

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
      <Link 
        to="/admin" 
        style={{ 
          position: 'absolute', 
          top: '30px', 
          right: '30px', 
          color: '#3B82F6', 
          opacity: 0.6,
          transition: 'opacity 0.2s',
          padding: '10px',
          zIndex: 100
        }}
        className="admin-gear"
        title="Admin Dashboard"
      >
        <Settings size={28} />
      </Link>
      <div className="lock-card glass-card">
        <img src={logo} alt="Tatt n' Snap" className="lock-splash-icon" style={{ objectFit: 'contain', borderRadius: 0, background: 'none' }} />
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
