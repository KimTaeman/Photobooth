import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, PASSWORD_HASH, sha256, getSetting, updateSetting } from '../hooks/useSupabase';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';
import { BarChart2, Camera, Film, Users, Clock, LockOpen, LogOut, Settings, Filter, Save, CheckCircle, LayoutTemplate, Trash2, ShieldCheck, RefreshCw, Printer, Download, AlertCircle, Info } from 'lucide-react';
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
  const [countdownDuration, setCountdownDuration] = useState(10);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoadRef = useRef(true);

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
    } else {
      setError('Incorrect password');
      setPassword('');
      logAdminAction('Failed login attempt');
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [sessionsRes, filterSetting, videoSetting, testModeSetting, countdownSetting, logsRes] = await Promise.all([
        supabase.from('sessions').select('*').order('created_at', { ascending: false }),
        getSetting('active_filter', 'none'),
        getSetting('enable_video', 'true'),
        getSetting('test_mode', 'false'),
        getSetting('countdown_duration', '10'),
        supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10)
      ]);
      
      if (sessionsRes.error) console.error('Error fetching sessions:', sessionsRes.error);
      if (logsRes.error) console.error('Error fetching admin logs:', logsRes.error);

      setSessions((sessionsRes.data as Session[]) || []);
      setActiveFilter(filterSetting);
      setEnableVideo(videoSetting === 'true');
      setTestMode(testModeSetting === 'true');
      setCountdownDuration(parseInt(countdownSetting));
      setLogs((logsRes.data as AdminLog[]) || []);
      
      // Mark first load as complete AFTER data is in state
      setTimeout(() => { firstLoadRef.current = false; }, 500);
    } catch (err) {
      console.error('Failed to load admin data (exception):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) {
      loadData();
      
      const channel = supabase
        .channel('admin-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
          loadData(true);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' }, () => {
          // Refresh logs if someone else is doing things
          supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(10)
            .then(res => res.data && setLogs(res.data as AdminLog[]));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authed]);

  const lastActionRef = useRef<string>('');

  const saveSettingsToDB = async (updates: Record<string, string | boolean | number>, customMsg?: string) => {
    setIsSaving(true);
    try {
      await Promise.all(
        Object.entries(updates).map(([key, val]) => updateSetting(key, val.toString()))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      showNotification(customMsg || 'Settings updated');
    } catch (err) {
      console.error('Auto-save failed:', err);
      showNotification('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAutoSave = (updates: Record<string, string | boolean | number>, customMsg: string) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSettingsToDB(updates, customMsg);
    }, 1200);
  };

  const handleUpdateSetting = (key: string, value: any) => {
    let nextActiveFilter = activeFilter;
    let nextEnableVideo = enableVideo;
    let nextTestMode = testMode;
    let nextCountdownDuration = countdownDuration;
    let msg = 'Setting updated';

    if (key === 'active_filter') {
      setActiveFilter(value);
      nextActiveFilter = value;
      const filterLabel = AVAILABLE_FILTERS.find(f => f.id === value)?.label || 'None';
      msg = `${filterLabel} filter applied`;
    }
    if (key === 'enable_video') {
      setEnableVideo(value);
      nextEnableVideo = value;
      msg = `Video recording ${value ? 'enabled' : 'disabled'}`;
    }
    if (key === 'test_mode') {
      setTestMode(value);
      nextTestMode = value;
      msg = `Test mode ${value ? 'turned on' : 'turned off'}`;
    }
    if (key === 'countdown_duration') {
      setCountdownDuration(value);
      nextCountdownDuration = value;
      msg = `Countdown set to ${value}s`;
    }

    if (!firstLoadRef.current) {
      triggerAutoSave({
        active_filter: nextActiveFilter,
        enable_video: nextEnableVideo,
        test_mode: nextTestMode,
        countdown_duration: nextCountdownDuration
      }, msg);
    }
  };

  const handleResetSessions = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL session records. Photos in Cloudinary will NOT be deleted. Proceed?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      
      setSessions([]);
      logAdminAction('Reset all sessions');
      showNotification('All session records cleared', 'info');
    } catch (err) {
      console.error('Failed to reset sessions:', err);
      showNotification('Error resetting sessions', 'error');
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
          <title>Print Photo Strip - ${id}</title>
          <style id="print-css">@page { size: A5 landscape; margin: 0; }</style>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; background: #f8fafc; font-family: system-ui; }
            .header { background: white; padding: 12px 24px; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
            .preview { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
            img { max-width: 100%; max-height: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.1); background: white; }
            button { padding: 10px 24px; border-radius: 10px; border: none; background: #3b82f6; color: white; font-weight: 700; cursor: pointer; }
            @media print { .header { display: none !important; } body { background: white; } .preview { padding: 0; } img { box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <button onclick="window.print()">Print Photo Strip</button>
            <button style="background: #e2e8f0; color: #475569;" onclick="window.close()">Cancel</button>
          </div>
          <div class="preview"><img src="${imgUrl}" /></div>
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
            <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748B', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
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
      {/* Toast Notification */}
      {notification && (
        <div style={{ 
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          background: notification.type === 'success' ? '#22C55E' : notification.type === 'error' ? '#EF4444' : '#3B82F6',
          color: 'white', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700,
          animation: 'slideIn 0.3s ease-out forwards'
        }}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : notification.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
          {notification.msg}
        </div>
      )}

      <header style={{ background: 'white', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(59,130,246,0.06)', marginBottom: '32px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#3B82F6', margin: 0, fontSize: '1.8rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 600 }}>Summer Splash Photobooth 2026</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '50px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
            <LayoutTemplate size={16} /> Go to Photobooth
          </Link>
          <button onClick={() => setAuthed(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '50px', border: '2px solid #BAE6FD', background: 'transparent', color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748B', fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', padding: '60px' }}>
            <RefreshCw size={40} className="spin" style={{ marginBottom: '16px', color: '#3B82F6' }} />
            <p>Loading sessions...</p>
          </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isSaving && <span style={{ fontSize: '0.8rem', color: '#3B82F6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} className="spin" /> Auto-saving...</span>}
                  <button 
                    disabled={isSaving}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', 
                      borderRadius: '50px', border: 'none', 
                      background: saveSuccess ? '#22C55E' : 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                      color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, 
                      cursor: 'default', fontSize: '0.9rem', transition: 'all 0.3s', opacity: isSaving ? 0.7 : 1
                    }}
                  >
                    {saveSuccess ? <CheckCircle size={18} /> : isSaving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                    {saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Settings Live'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                    <Filter size={18} color="#3B82F6" /> Global Photo Filter
                  </label>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '16px' }}>Select a filter to be applied to all final photo strips and GIF clips.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {AVAILABLE_FILTERS.map(f => (
                      <div 
                        key={f.id} 
                        onClick={() => handleUpdateSetting('active_filter', f.id)}
                        style={{ 
                          padding: '12px', borderRadius: '16px', border: `2px solid ${activeFilter === f.id ? '#3B82F6' : '#F1F5F9'}`,
                          background: activeFilter === f.id ? '#F0F9FF' : 'white', cursor: 'pointer',
                          transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'
                        }}
                      >
                        <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '8px', backgroundImage: `url(${filterPrevImg})`, backgroundPosition: 'center', backgroundSize: 'cover', filter: f.preview, border: '1px solid #E2E8F0' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeFilter === f.id ? '#1E3A5F' : '#64748B' }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <Film size={18} color="#3B82F6" /> Session Options
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', color: '#1E3A5F', fontWeight: 600 }}>Enable Video Recording</span>
                        <div 
                          onClick={() => handleUpdateSetting('enable_video', !enableVideo)}
                          style={{ width: '44px', height: '24px', borderRadius: '12px', background: enableVideo ? '#3B82F6' : '#E2E8F0', position: 'relative', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: enableVideo ? '23px' : '3px', transition: 'all 0.2s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', color: '#1E3A5F', fontWeight: 600 }}>Test Mode (Fast Countdowns)</span>
                        <div 
                          onClick={() => handleUpdateSetting('test_mode', !testMode)}
                          style={{ width: '44px', height: '24px', borderRadius: '12px', background: testMode ? '#F59E0B' : '#E2E8F0', position: 'relative', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: testMode ? '23px' : '3px', transition: 'all 0.2s' }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Countdown Duration (1-120s)</label>
                        <input 
                          type="number" min="1" max="120" value={countdownDuration}
                          onChange={(e) => handleUpdateSetting('countdown_duration', Math.min(120, Math.max(1, parseInt(e.target.value) || 1)))}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #E2E8F0', fontSize: '0.9rem', width: '100%', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E3A5F', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <ShieldCheck size={18} color="#3B82F6" /> Recent Admin Logs
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {logs.length > 0 ? logs.map(log => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', background: 'white', padding: '8px 12px', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{log.action}</span>
                          <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )) : (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>No recent logs</div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#FFF1F2', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E11D48', fontWeight: 700, marginBottom: '12px', fontSize: '1rem' }}>
                      <Trash2 size={18} color="#E11D48" /> Danger Zone
                    </label>
                    <button 
                      onClick={handleResetSessions}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#E11D48', color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Trash2 size={16} /> Reset All Sessions
                    </button>
                    <p style={{ color: '#F43F5E', fontSize: '0.7rem', marginTop: '12px', textAlign: 'center', fontWeight: 600 }}>Clears database history. Photos remain safe in Cloudinary.</p>
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
                  <button onClick={() => loadData()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '50px', border: '2px solid #BAE6FD', background: 'transparent', color: '#3B82F6', fontFamily: 'Fredoka, sans-serif', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                  {sessions.slice(0, 24).map(s => (
                    <div key={s.id} className="admin-session-card" style={{ borderRadius: '16px', overflow: 'hidden', background: '#F1F5F9', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <img src={getThumbnail(s.id)} alt={s.id} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                      <div className="admin-session-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(30, 58, 95, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0, transition: 'opacity 0.2s', cursor: 'default' }}>
                        <button onClick={() => handleAdminPrint(s.id)} title="Print" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Printer size={20} /></button>
                        <button onClick={() => handleAdminDownload(s.id)} title="Download" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={20} /></button>
                        <a href={`https://photobooth-teal-pi.vercel.app/#/summer-splash?id=${s.id}${s.has_video ? '&v=1' : ''}&g=1`} target="_blank" rel="noopener noreferrer" title="View Page" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutTemplate size={20} /></a>
                      </div>
                      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#1E3A5F', fontWeight: 700, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{s.has_video ? '🎬 Video' : '📷 Photo'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .admin-session-card:hover .admin-session-overlay { opacity: 1 !important; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AdminPage;
