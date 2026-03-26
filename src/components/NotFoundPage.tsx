import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle, Camera } from 'lucide-react';
import Stickers from './Stickers';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-page" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '20px',
      background: 'url("/background.png") center/cover no-repeat',
      position: 'relative',
      fontFamily: 'Nunito, sans-serif'
    }}>
      {/* Decorative Stickers */}
      <Stickers />
      
      {/* Overlay to ensure readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 0
      }} />

      <div className="glass-card" style={{
        padding: '48px 32px',
        maxWidth: '450px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        borderRadius: '32px',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.12)',
        border: '1.5px solid rgba(255, 255, 255, 0.8)',
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EF4444',
          marginBottom: '8px'
        }}>
          <AlertCircle size={48} strokeWidth={1.5} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ 
            fontFamily: 'Fredoka, sans-serif', 
            color: '#1E3A5F', 
            fontSize: '2.5rem',
            margin: 0,
            lineHeight: 1
          }}>
            404
          </h1>
          <h2 style={{ 
            fontFamily: 'Fredoka, sans-serif', 
            color: '#3B82F6', 
            fontSize: '1.4rem',
            margin: 0
          }}>
            Page Not Found
          </h2>
          <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: '1.6', margin: 0, marginTop: '8px' }}>
            Oops! This page is playing hide and seek. We can't seem to find it!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px', marginTop: '8px' }}>
          <Link to="/" className="btn btn-primary btn-lg" style={{
            textDecoration: 'none',
            width: '100%',
            fontSize: '1.1rem'
          }}>
            <Home size={20} /> Back to Home
          </Link>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#94A3B8',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginTop: '10px'
          }}>
            <Camera size={16} /> Tatt n' Snap 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
