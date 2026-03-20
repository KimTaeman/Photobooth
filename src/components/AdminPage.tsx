import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, PASSWORD_HASH, sha256, getSetting, updateSetting } from '../hooks/useSupabase';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';
import { BarChart2, Camera, Film, Users, Clock, LockOpen, LogOut, Settings, Filter, Save, CheckCircle, LayoutTemplate, Trash2, ShieldCheck, Zap, RefreshCw, Printer, Download } from 'lucide-react';
import heroImg from '../assets/jin.jpg';
const filterPrevImg = heroImg;

interface Session {
  id: string;
  created_at: string;
  frame: string | null;
  has_video: boolean;
}

interface AdminLog {
  id: string;
  created_at: string;
  action: string;
}

const AVAILABLE_FILTERS = [
  { id: 'none', label: 'None (Natural)', preview: 'none' },
  { id: 'grayscale(100%)', label: 'B&W Classic', preview: 'grayscale(100%)' },
  { id: 'sepia(100%)', label: 'Vintage Sepia', preview: 'sepia(100%)' },
  { id: 'contrast(120%) brightness(110%)', label: 'Vivid Pop', preview: 'contrast(120%) brightness(110%)' },
  { id: 'saturate(150%)', label: 'High Saturation', preview: 'saturate(150%)' },
  { id: 'contrast(150%) brightness(80%) grayscale(100%)', label: 'Noir', preview: 'contrast(150%) brightness(80%) grayscale(100%)' },
  { id: 'hue-rotate(180deg)', label: 'Psychedelic', preview: 'hue-rotate(180deg)' },
  { id: 'blur(2px)', label: 'Soft Focus', preview: 'blur(2px)' },
];

interface AdminPageProps {
  authed: boolean;
  setAuthed: (val: boolean) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ authed, setAuthed }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('none');
  const [enableVideo, setEnableVideo] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const logAdminAction = async (action: string) => {
    try {
      await supabase.from('admin_logs').insert({ action });
    } catch (err) {
      console.error('Failed to log admin action:', err);
    }
  };

  const handleLogin = async () => {
    const hash = await sha256(password);
    if (hash === PASSWORD_HASH) {
      setAuthed(true);
      setError('');
      logAdminAction('Dashboard login');
      // No need to call loadData here as the useEffect[authed] will trigger
    } else {
      setError('Incorrect password');
      setPassword('');
      logAdminAction('Failed login attempt');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, filterSetting, videoSetting, testModeSetting, logsRes] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }),
        getSetting('active_filter', 'none'),
        getSetting('enable_video', 'true'),
        getSetting('test_mode', 'false'),
        supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10)
      ]);
      
      if (sessionsRes.error) console.error('Error fetching sessions:', sessionsRes.error);
      if (logsRes.error) console.error('Error fetching admin logs:', logsRes.error);

      setSessions((sessionsRes.data as Session[]) || []);
      setActiveFilter(filterSetting);
      setEnableVideo(videoSetting === 'true');
      setTestMode(testModeSetting === 'true');
      setLogs((logsRes.data as AdminLog[]) || []);
    } catch (err) {
      console.error('Failed to load admin data (exception):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) {
      loadData();
    }
  }, [authed]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await Promise.all([
      updateSetting('active_filter', activeFilter),
      updateSetting('enable_video', enableVideo ? 'true' : 'false'),
      updateSetting('test_mode', testMode ? 'true' : 'false')
    ]);
    logAdminAction('Updated settings');
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetSessions = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL session records from the database. Photos in Cloudinary will NOT be deleted. Proceed?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      
      setSessions([]);
      logAdminAction('Reset all sessions');
      alert('All session records have been cleared.');
    } catch (err) {
      console.error('Failed to reset sessions:', err);
      alert('Error resetting sessions: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getThumbnail = (id: string) =>
    `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_267,c_fill/${id}_final.jpg`;

  const getFullSizeUrl = (id: string) =>
    `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${id}_final.jpg`;

  const handleAdminPrint = (id: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const imgUrl = getFullSizeUrl(id);
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Photo Strip</title>
          <style>
            @page { size: auto; margin: 0; }
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
            img { max-width: 100%; max-height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${imgUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAdminDownload = (id: string) => {
    const link = document.createElement('a');
    link.href = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/fl_attachment:SummerSplash_PhotoStrip/${id}_final.jpg`;
    link.download = `SummerSplash_${id}.jpg`;
    link.click();
  };

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
          
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #E2E8F0' }}>
            <Link 
              to="/" 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                color: '#64748B', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600
              }}
            >
              <LayoutTemplate size={16} /> Go to Photobooth
            </Link>
          </div>
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
    <div style={{ height: '100vh', overflowY: 'auto', background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)', fontFamily: 'Nunito, sans-serif', padding: '0 0 60px' }}>
      <header style={{ background: 'white', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(59,130,246,0.06)', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#3B82F6', margin: 0, fontSize: '1.8rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>Summer Splash Photobooth 2026</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', 
              borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
              color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, 
              cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'none' 
            }}
          >
            <LayoutTemplate size={16} /> Go to Photobooth
          </Link>
          <button 
            onClick={() => setAuthed(false)} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', 
              borderRadius: '50px', border: '2px solid #BAE6FD', background: 'transparent', 
              color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, 
              cursor: 'pointer', fontSize: '0.9rem' 
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
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

            {/* Application Settings */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={20} color="#3B82F6" /> Photobooth Settings
                </h2>
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', 
                    borderRadius: '50px', border: 'none', 
                    background: saveSuccess ? '#22c55e' : 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                    color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, 
                    cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s'
                  }}
                >
                  {saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                  {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                    <Filter size={18} color="#3B82F6" /> Global Photo Filter
                  </label>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Select a filter to be applied to all final photo strips and GIF clips.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {AVAILABLE_FILTERS.map(f => (
                      <div 
                        key={f.id} 
                        onClick={() => setActiveFilter(f.id)}
                        style={{ 
                          padding: '12px', borderRadius: '16px', border: `2px solid ${activeFilter === f.id ? '#3B82F6' : '#F1F5F9'}`,
                          background: activeFilter === f.id ? '#F0F9FF' : 'white', cursor: 'pointer',
                          transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'
                        }}
                      >
                        <div style={{ 
                          width: '100%', aspectRatio: '4/3', borderRadius: '8px', 
                          backgroundImage: `url(${filterPrevImg})`, backgroundPosition: 'center', backgroundSize: 'cover',
                          filter: f.preview, border: '1px solid #E2E8F0'
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeFilter === f.id ? '#1E3A5F' : '#64748B' }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <Film size={18} color="#3B82F6" /> Session Options
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <div 
                          onClick={() => setEnableVideo(!enableVideo)}
                          style={{ 
                            width: '44px', height: '24px', borderRadius: '12px', background: enableVideo ? '#3B82F6' : '#E2E8F0',
                            position: 'relative', transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: enableVideo ? '23px' : '3px', transition: 'all 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#1E3A5F', fontWeight: 600 }}>Enable Video Recording</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <div 
                          onClick={() => setTestMode(!testMode)}
                          style={{ 
                            width: '44px', height: '24px', borderRadius: '12px', background: testMode ? '#F59E0B' : '#E2E8F0',
                            position: 'relative', transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: testMode ? '23px' : '3px', transition: 'all 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#1E3A5F', fontWeight: 600 }}>Test Mode (Fast Countdowns)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <ShieldCheck size={18} color="#3B82F6" /> Recent Admin Logs
                    </label>
                    <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {logs.length > 0 ? logs.map(log => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
                          <span style={{ fontWeight: 600 }}>{log.action}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )) : (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>No recent logs</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <Trash2 size={18} color="#EF4444" /> Data Management
                    </label>
                    <button 
                      onClick={handleResetSessions}
                      style={{ 
                        width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #FECACA',
                        background: '#FEF2F2', color: '#EF4444', fontFamily: 'Fredoka, sans-serif',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
                      }}
                    >
                      <Trash2 size={16} /> Reset All Sessions
                    </button>
                    <p style={{ color: '#94A3B8', fontSize: '0.7rem', marginTop: '8px', textAlign: 'center' }}>
                      Clears session history. Does not delete Cloudinary files.
                    </p>
                  </div>
                </div>
              </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={20} color="#3B82F6" /> Recent Sessions
                  </h2>
                  <button 
                    onClick={loadData}
                    disabled={loading}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                      borderRadius: '50px', border: '2px solid #BAE6FD', background: 'transparent', 
                      color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, 
                      cursor: 'pointer', fontSize: '0.8rem'
                    }}
                  >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {sessions.slice(0, 24).map(s => (
                    <div key={s.id} className="admin-session-card" style={{ borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9', position: 'relative' }}>
                      <img src={getThumbnail(s.id)} alt={s.id} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                      
                      <div className="admin-session-overlay" style={{ 
                        position: 'absolute', inset: 0, background: 'rgba(30, 58, 95, 0.7)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        opacity: 0, transition: 'opacity 0.2s', cursor: 'default'
                      }}>
                        <button 
                          onClick={() => handleAdminPrint(s.id)}
                          title="Print"
                          style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
                            background: 'white', color: '#3B82F6', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={() => handleAdminDownload(s.id)}
                          title="Download"
                          style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
                            background: 'white', color: '#3B82F6', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <Download size={18} />
                        </button>
                        <a 
                          href={`https://photobooth-teal-pi.vercel.app/#/summer-splash?id=${s.id}${s.has_video ? '&v=1' : ''}&g=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Page"
                          style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
                            background: 'white', color: '#3B82F6', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <LayoutTemplate size={18} />
                        </a>
                      </div>

                      <div style={{ padding: '6px 8px', fontSize: '0.65rem', color: '#64748B', fontWeight: 700, background: 'white' }}>
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
