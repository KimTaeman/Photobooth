import React, { useState, useEffect } from 'react';
import { supabase, PASSWORD_HASH, sha256 } from '../hooks/useSupabase';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';
import { BarChart2, Camera, Film, Users, Clock, LockOpen, LogOut } from 'lucide-react';

interface Session {
  id: string;
  created_at: string;
  frame: string | null;
  has_video: boolean;
}

const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const hash = await sha256(password);
    if (hash === PASSWORD_HASH) {
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  useEffect(() => {
    if (!authed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    supabase.from('sessions').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setSessions((data as Session[]) || []); setLoading(false); });
  }, [authed]);

  const getThumbnail = (id: string) =>
    `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_267,c_fill/${id}_final.jpg`;

  if (!authed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-gradient)', fontFamily: 'Nunito, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '48px 40px', width: '360px', boxShadow: '0 16px 48px rgba(59,130,246,0.12)', textAlign: 'center' }}>
          <BarChart2 size={40} color="#3B82F6" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', fontSize: '1.8rem', margin: '0 0 6px' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '24px' }}>Summer Splash Photobooth 2026</p>
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #BAE6FD', fontSize: '1rem', fontFamily: 'Nunito, sans-serif', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 700 }}>{error}</p>}
          <button onClick={handleLogin} style={{ width: '100%', padding: '14px', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #FEF08A, #FACC15)', color: '#92400E', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <LockOpen size={18} /> Unlock
          </button>
        </div>
      </div>
    );
  }

  const today = new Date().toDateString();
  const todayCount = sessions.filter(s => new Date(s.created_at).toDateString() === today).length;
  const withVideo = sessions.filter(s => s.has_video).length;
  const frame1Count = sessions.filter(s => s.frame?.includes('frame1')).length;
  const frame2Count = sessions.filter(s => s.frame?.includes('frame2')).length;
  const byHour = Array(24).fill(0);
  sessions.forEach(s => { byHour[new Date(s.created_at).getHours()]++; });
  const maxHourly = Math.max(...byHour, 1);

  const statCard = (icon: React.ReactNode, label: string, value: number | string) => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px', flex: 1 }}>
      <div style={{ color: '#3B82F6' }}>{icon}</div>
      <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#1E3A5F', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 700 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)', fontFamily: 'Nunito, sans-serif', padding: '0 0 60px' }}>
      <header style={{ background: 'white', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(59,130,246,0.06)', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#3B82F6', margin: 0, fontSize: '1.8rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>Summer Splash Photobooth 2026</p>
        </div>
        <button onClick={() => setAuthed(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '50px', border: '2px solid #BAE6FD', background: 'transparent', color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748B', fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', padding: '60px' }}>Loading sessions…</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {statCard(<Users size={22} />, 'Total Sessions', sessions.length)}
              {statCard(<Clock size={22} />, 'Today', todayCount)}
              {statCard(<Film size={22} />, 'With Video', withVideo)}
              {statCard(<Camera size={22} />, 'Frame 1', frame1Count)}
              {statCard(<Camera size={22} />, 'Frame 2', frame2Count)}
            </div>

            {/* Hourly chart */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', margin: '0 0 24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} color="#3B82F6" /> Sessions by Hour
              </h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {byHour.map((count, h) => (
                  <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div title={`${h}:00 — ${count} sessions`} style={{ width: '100%', background: count > 0 ? '#3B82F6' : '#E2E8F0', borderRadius: '4px 4px 0 0', height: `${(count / maxHourly) * 100}px`, minHeight: count > 0 ? '4px' : '2px', transition: 'height 0.3s' }} />
                    {h % 4 === 0 && <span style={{ fontSize: '0.6rem', color: '#94A3B8', fontWeight: 700 }}>{h}h</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent gallery */}
            {sessions.length > 0 && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', margin: '0 0 20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={20} color="#3B82F6" /> Recent Sessions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {sessions.slice(0, 24).map(s => (
                    <div key={s.id} style={{ borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9', position: 'relative' }}>
                      <img src={getThumbnail(s.id)} alt={s.id} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                      <div style={{ padding: '6px 8px', fontSize: '0.65rem', color: '#64748B', fontWeight: 700 }}>
                        {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.has_video ? '🎬' : '📷'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
