import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Stickers from './components/Stickers';
import type { Screen } from './types';
import {
  getAllSettingsResult,
  getAppRole,
  supabase,
  type ConfigLoadResult,
} from './hooks/useSupabase';
import type { RemoteConfig } from './config/remoteConfig';
import { revokeObjectUrl } from './lib/objectUrls';
import { UploadQueueProvider } from './context/UploadQueueContext';

const LockScreen = lazy(() => import('./components/LockScreen'));
const FrameSelectionScreen = lazy(() => import('./components/FrameSelectionScreen'));
const CameraScreen = lazy(() => import('./components/CameraScreen'));
const ResultScreen = lazy(() => import('./components/ResultScreen'));
const SummerSplashPage = lazy(() => import('./components/SummerSplashPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const StickerTestPage = lazy(() => import('./components/StickerTestPage'));

function LoadingScreen() {
  return (
    <div className="route-loading" role="status">
      Loading photobooth…
    </div>
  );
}

function ConfigStatus({ source }: { source: ConfigLoadResult['source'] | null }) {
  if (!source || source === 'remote') return null;
  return (
    <div className="connection-status" role="status">
      {source === 'cache' ? 'Offline · using last saved settings' : 'Offline · using safe defaults'}
    </div>
  );
}

function PhotoboothApp({ isOperatorAuthenticated }: { isOperatorAuthenticated: boolean }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    isOperatorAuthenticated ? 'frames' : 'lock',
  );
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [sessionBursts, setSessionBursts] = useState<string[][]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [config, setConfig] = useState<RemoteConfig | null>(null);
  const [configSource, setConfigSource] = useState<ConfigLoadResult['source'] | null>(null);
  const mediaUrlsRef = useRef<string[]>([]);
  const [theme, setTheme] = useState<'premium' | 'cute'>(
    () => (localStorage.getItem('pb_theme') as 'premium' | 'cute') || 'premium',
  );

  useEffect(() => {
    let active = true;
    const fetchConfig = async () => {
      const result = await getAllSettingsResult();
      if (!active) return;
      setConfig(result.config);
      setConfigSource(result.source);
      setTheme(result.config.theme);
      localStorage.setItem('pb_theme', result.config.theme);
    };
    void fetchConfig();

    const channel = supabase
      .channel('public:settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        void fetchConfig();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void fetchConfig();
      });

    const handleOnline = () => void fetchConfig();
    window.addEventListener('online', handleOnline);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    mediaUrlsRef.current = [...sessionPhotos, ...sessionBursts.flat()];
  }, [sessionBursts, sessionPhotos]);

  useEffect(
    () => () => {
      mediaUrlsRef.current.forEach(revokeObjectUrl);
    },
    [],
  );

  const handleCameraComplete = (photos: string[], video: Blob | null, bursts: string[][]) => {
    setSessionPhotos(photos);
    setSessionBursts(bursts);
    setVideoBlob(video);
    setCurrentScreen('result');
  };

  const handleNewSession = () => {
    mediaUrlsRef.current.forEach(revokeObjectUrl);
    setSessionPhotos([]);
    setSessionBursts([]);
    setVideoBlob(null);
    setSelectedFrame(null);
    setCurrentScreen('frames');
  };

  let activeScreen;
  switch (currentScreen) {
    case 'lock':
      activeScreen = <LockScreen isActive onUnlock={() => setCurrentScreen('frames')} />;
      break;
    case 'frames':
      activeScreen = (
        <FrameSelectionScreen
          isActive
          selectedFrame={selectedFrame}
          onSelectFrame={setSelectedFrame}
          onStartSession={() => setCurrentScreen('camera')}
          availableFrames={config?.availableFrames}
          config={config}
        />
      );
      break;
    case 'camera':
      activeScreen = (
        <CameraScreen
          isActive
          selectedFrame={selectedFrame}
          onBack={() => setCurrentScreen('frames')}
          onComplete={handleCameraComplete}
          config={config}
        />
      );
      break;
    case 'result':
      activeScreen = (
        <ResultScreen
          isActive
          photos={sessionPhotos}
          photosBursts={sessionBursts}
          videoBlob={videoBlob}
          selectedFrame={selectedFrame}
          onNewSession={handleNewSession}
          config={config}
        />
      );
      break;
  }

  return (
    <div className={`app-container theme-${theme}`}>
      <ConfigStatus source={configSource} />
      <Stickers config={config} />
      <Suspense fallback={<LoadingScreen />}>{activeScreen}</Suspense>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setAuthReady(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!authReady) return <LoadingScreen />;

  const role = getAppRole(user);
  const isOperatorAuthenticated = role === 'operator' || role === 'admin';
  const isAdminAuthenticated = role === 'admin';

  return (
    <UploadQueueProvider>
      <HashRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={<PhotoboothApp isOperatorAuthenticated={isOperatorAuthenticated} />}
            />
            <Route path="/summer-splash" element={<SummerSplashPage />} />
            <Route path="/admin" element={<AdminPage authed={isAdminAuthenticated} />} />
            <Route path="/sticker-test" element={<StickerTestPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </UploadQueueProvider>
  );
}

export default App;
