import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Stickers from './components/Stickers';
import LockScreen from './components/LockScreen';
import FrameSelectionScreen from './components/FrameSelectionScreen';
import CameraScreen from './components/CameraScreen';
import ResultScreen from './components/ResultScreen';
import SummerSplashPage from './components/SummerSplashPage';
import AdminPage from './components/AdminPage';
import NotFoundPage from './components/NotFoundPage';
import StickerTestPage from './components/StickerTestPage';
import type { Screen } from './types';
import { getAllSettings, supabase } from './hooks/useSupabase';
import type { RemoteConfig } from './hooks/useSupabase';

function PhotoboothApp({ isAdminAuthenticated }: { isAdminAuthenticated: boolean }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>(isAdminAuthenticated ? 'frames' : 'lock');
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [sessionBursts, setSessionBursts] = useState<string[][]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [config, setConfig] = useState<RemoteConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const remoteConfig = await getAllSettings();
      setConfig(remoteConfig);
    };
    fetchConfig();

    // Subscribe to real-time updates for settings
    const channel = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchConfig();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUnlock = () => {
    setCurrentScreen('frames');
  };

  const handleSelectFrame = (frame: string) => {
    setSelectedFrame(frame);
  };

  const handleStartSession = () => {
    setCurrentScreen('camera');
  };

  const handleCameraBack = () => {
    setCurrentScreen('frames');
  };

  const handleCameraComplete = (photos: string[], video: Blob | null, bursts: string[][]) => {
    setSessionPhotos(photos);
    setSessionBursts(bursts);
    setVideoBlob(video);
    setCurrentScreen('result');
  };

  const handleNewSession = () => {
    // Revoke URLs to free memory
    sessionPhotos.forEach(url => URL.revokeObjectURL(url));
    sessionBursts.flat().forEach(url => URL.revokeObjectURL(url));
    
    // Clear all session states
    setSessionPhotos([]);
    setSessionBursts([]);
    setVideoBlob(null);
    setSelectedFrame(null);
    setCurrentScreen('frames');
  };

  return (
    <div className={`app-container theme-${config?.eventTheme || 'default'}`}>
      <Stickers />
      
      <LockScreen 
        isActive={currentScreen === 'lock'} 
        onUnlock={handleUnlock} 
      />

      <FrameSelectionScreen 
        isActive={currentScreen === 'frames'}
        selectedFrame={selectedFrame}
        onSelectFrame={handleSelectFrame}
        onStartSession={handleStartSession}
        availableFrames={config?.availableFrames}
      />

      <CameraScreen 
        isActive={currentScreen === 'camera'}
        selectedFrame={selectedFrame}
        onBack={handleCameraBack}
        onComplete={handleCameraComplete}
        config={config}
      />

      <ResultScreen
        isActive={currentScreen === 'result'}
        photos={sessionPhotos}
        photosBursts={sessionBursts}
        videoBlob={videoBlob}
        selectedFrame={selectedFrame}
        onNewSession={handleNewSession}
        config={config}
      />
    </div>
  );
}

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PhotoboothApp isAdminAuthenticated={isAdminAuthenticated} />} />
        <Route path="/summer-splash" element={<SummerSplashPage />} />
        <Route path="/admin" element={<AdminPage authed={isAdminAuthenticated} setAuthed={setIsAdminAuthenticated} />} />
        <Route path="/sticker-test" element={<StickerTestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
