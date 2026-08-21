import React, { useState } from 'react';
import { LockOpen, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signInOperator } from '../hooks/useSupabase';
import logo from '../assets/logo.png';

interface LockScreenProps {
  onUnlock: () => void;
  isActive: boolean;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, isActive }) => {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async () => {
    setIsSubmitting(true);
    try {
      await signInOperator(email.trim(), password);
      setError('');
      onUnlock();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 400);
    } finally {
      setIsSubmitting(false);
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
          zIndex: 100,
        }}
        className="admin-gear"
        title="Admin Dashboard"
      >
        <Settings size={28} />
      </Link>
      <div className="lock-card glass-card">
        <img
          src={logo}
          alt="Tatt n' Snap"
          className="lock-splash-icon"
          style={{ objectFit: 'contain', borderRadius: 0, background: 'none' }}
        />
        <p>Sign in with an authorized operator account</p>
        <label className="sr-only" htmlFor="operator-email">
          Operator email
        </label>
        <input
          id="operator-email"
          type="email"
          className="lock-input"
          placeholder="Operator email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          style={{ marginBottom: '10px' }}
        />
        <label className="sr-only" htmlFor="operator-password">
          Password
        </label>
        <input
          id="operator-password"
          type="password"
          className={`lock-input ${shake ? 'shake' : ''}`}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="current-password"
        />
        <div className="lock-error" role="alert">
          {error}
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={handleUnlock}
          disabled={isSubmitting || !email || !password}
        >
          <LockOpen size={18} /> {isSubmitting ? 'Signing in…' : 'Unlock'}
        </button>
      </div>
    </div>
  );
};

export default LockScreen;
