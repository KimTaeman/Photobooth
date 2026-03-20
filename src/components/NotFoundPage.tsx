import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle, Camera } from 'lucide-react';

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
      background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
      fontFamily: 'Nunito, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '30px',
        boxShadow: '0 10px 40px rgba(59, 130, 246, 0.1)',
        maxWidth: '400px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EF4444'
        }}>
          <AlertCircle size={40} />
        </div>
        
        <h1 style={{ 
          fontFamily: 'Fredoka, sans-serif', 
          color: '#1E3A5F', 
          fontSize: '2rem',
          margin: 0
        }}>
          404
        </h1>
        
        <h2 style={{ 
          fontFamily: 'Fredoka, sans-serif', 
          color: '#1E3A5F', 
          fontSize: '1.2rem',
          margin: 0
        }}>
          Page Not Found
        </h2>
        
        <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px', marginTop: '10px' }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderRadius: '50px',
            background: '#3B82F6',
            color: 'white',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
          }}>
            <Home size={18} /> Back to Home
          </Link>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#94A3B8',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            <Camera size={14} /> Photobooth 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
