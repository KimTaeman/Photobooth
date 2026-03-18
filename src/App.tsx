import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Stickers from './components/Stickers';
import LockScreen from './components/LockScreen';
import FrameSelectionScreen from './components/FrameSelectionScreen';
import CameraScreen from './components/CameraScreen';
import ResultScreen from './components/ResultScreen';
import SummerSplashPage from './components/SummerSplashPage';
import AdminPage from './components/AdminPage';
import type { Screen } from './types';

function PhotoboothApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('lock');
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);
  const [sessionBursts, setSessionBursts] = useState<string[][]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

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
    sessionPhotos.forEach(url => URL.revokeObjectURL(url));
    sessionBursts.flat().forEach(url => URL.revokeObjectURL(url));
    setSessionPhotos([]);
    setSessionBursts([]);
    setVideoBlob(null);
    setSelectedFrame(null);
    setCurrentScreen('frames');
  };

  return (
    <div className="app-container">
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
      />

      <CameraScreen 
        isActive={currentScreen === 'camera'}
        selectedFrame={selectedFrame}
        onBack={handleCameraBack}
        onComplete={handleCameraComplete}
      />

      <ResultScreen
        isActive={currentScreen === 'result'}
        photos={sessionPhotos}
        photosBursts={sessionBursts}
        videoBlob={videoBlob}
        selectedFrame={selectedFrame}
        onNewSession={handleNewSession}
      />
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PhotoboothApp />} />
        <Route path="/summer-splash" element={<SummerSplashPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
