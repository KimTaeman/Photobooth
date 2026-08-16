import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  Film,
  Image,
  Camera,
  Share2,
  Heart,
  Clock,
  AlertCircle,
  Clapperboard,
  Home,
} from 'lucide-react';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';
import Stickers from './Stickers';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { getAllSettingsResult } from '../hooks/useSupabase';
import { downloadBlob } from '../lib/objectUrls';

const SummerSplashPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('id');
  const hasVideo = searchParams.get('v') === '1';
  const hasGif = searchParams.get('g') === '1';

  // All hooks must be declared before any early return
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [finalImgError, setFinalImgError] = useState(false);
  const [loadedImgs, setLoadedImgs] = useState<Set<string>>(new Set());
  const markLoaded = (key: string) => setLoadedImgs((prev) => new Set(prev).add(key));
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [theme, setTheme] = useState<'premium' | 'cute'>(() => {
    return (localStorage.getItem('pb_theme') as 'premium' | 'cute') || 'premium';
  });

  useEffect(() => {
    const fetchTheme = async () => {
      const { config } = await getAllSettingsResult();
      const themeValue = config.theme;
      setTheme(themeValue);
      localStorage.setItem('pb_theme', themeValue);
    };
    fetchTheme();
  }, []);

  const isPremium = theme === 'premium';

  const getCloudinaryUrl = useCallback(
    (suffix: string, isVideo = false, download = false) => {
      const type = isVideo ? 'video' : 'image';
      const resource = 'upload';
      const filename = isVideo
        ? 'SummerSplash_Video'
        : suffix.includes('final')
          ? 'SummerSplash_PhotoStrip'
          : `SummerSplash_Shot`;
      const attachment = download ? `fl_attachment:${filename}/` : '';

      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${type}/${resource}/${attachment}${sessionId}_${suffix}`;
    },
    [sessionId],
  );

  const finalUrl = useMemo(() => getCloudinaryUrl('final.jpg'), [getCloudinaryUrl]);
  const finalDownloadUrl = useMemo(
    () => getCloudinaryUrl('final.jpg', false, true),
    [getCloudinaryUrl],
  );
  const gifUrl = useMemo(
    () => (hasGif ? getCloudinaryUrl('clip.gif') : null),
    [hasGif, getCloudinaryUrl],
  );
  const gifDownloadUrl = useMemo(
    () => (hasGif ? getCloudinaryUrl('clip.gif', false, true) : null),
    [hasGif, getCloudinaryUrl],
  );
  const videoMp4Url = useMemo(
    () => (hasVideo ? getCloudinaryUrl('video.mp4', true) : null),
    [hasVideo, getCloudinaryUrl],
  );
  const videoWebmUrl = useMemo(
    () => (hasVideo ? getCloudinaryUrl('video.webm', true) : null),
    [hasVideo, getCloudinaryUrl],
  );
  const videoDownloadUrl = useMemo(
    () => (hasVideo ? getCloudinaryUrl('video.mp4', true, true) : null),
    [hasVideo, getCloudinaryUrl],
  );

  const shots = useMemo(
    () =>
      [1, 2, 3, 4].map((num) => ({
        url: getCloudinaryUrl(`shot_${num}.jpg`),
        downloadUrl: getCloudinaryUrl(`shot_${num}.jpg`, false, true),
      })),
    [getCloudinaryUrl],
  );

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Tatt n' Snap 2026 – My Memories", url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  if (finalImgError || !sessionId) {
    return (
      <div
        className="summer-splash-page"
        style={{
          background: 'url("/background.png") center/cover no-repeat',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '20px',
          fontFamily: 'Nunito, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Stickers />

        {/* Overlay to ensure readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 0,
          }}
        />

        <div
          className="glass-card"
          style={{
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
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
              marginBottom: '8px',
            }}
          >
            <Clock size={48} strokeWidth={1.5} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1
              style={{
                fontFamily: 'Fredoka, sans-serif',
                color: '#1E3A5F',
                fontSize: '1.8rem',
                margin: 0,
              }}
            >
              Memories Expired
            </h1>
            <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
              Oops! It looks like this session has expired or is no longer available.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(254, 249, 195, 0.6)',
              padding: '16px 20px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              textAlign: 'left',
              border: '1px solid rgba(250, 204, 21, 0.3)',
            }}
          >
            <AlertCircle size={20} color="#92400E" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: '#92400E', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
              For privacy and storage, all photobooth memories are permanently deleted 24 hours
              after capture.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
            <Link
              to="/"
              className="btn btn-primary btn-lg"
              style={{
                textDecoration: 'none',
                width: '100%',
                fontSize: '1rem',
              }}
            >
              <Home size={18} /> Go to Photobooth
            </Link>
          </div>

          <div
            style={{ borderTop: '1px solid rgba(0,0,0,0.05)', width: '100%', paddingTop: '10px' }}
          >
            <p
              style={{
                color: '#94A3B8',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Camera size={14} /> Tatt n' Snap 2026
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`summer-splash-page theme-${theme}`}
      style={{
        background: isPremium
          ? 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
        minHeight: '100vh',
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: isPremium ? '"Nunito", sans-serif' : 'Nunito, sans-serif',
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        color: isPremium ? '#F8FAFC' : '#1E3A5F',
      }}
    >
      <header
        style={{
          width: '100%',
          padding: '40px 20px 20px',
          textAlign: 'center',
          background: isPremium ? '#0f172a' : 'white',
          borderBottomLeftRadius: '40px',
          borderBottomRightRadius: '40px',
          boxShadow: isPremium
            ? '0 4px 30px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(59, 130, 246, 0.05)',
          marginBottom: '20px',
          borderBottom: isPremium ? '1px solid rgba(212, 175, 55, 0.2)' : 'none',
        }}
      >
        <img
          src={logoImg}
          alt="Tatt n' Snap 2026"
          style={{
            maxWidth: '220px',
            width: '60%',
            height: 'auto',
            margin: '0 auto 4px',
            display: 'block',
            filter: isPremium ? 'brightness(0) invert(1)' : 'none',
          }}
        />
        <p
          style={{
            color: isPremium ? '#94A3B8' : '#64748B',
            marginTop: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Your Memories are Ready!
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '10px',
            padding: '6px 14px',
            borderRadius: '50px',
            background: isPremium ? 'rgba(212, 175, 55, 0.15)' : '#FEF9C3',
            color: isPremium ? '#D4AF37' : '#92400E',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: isPremium ? '1px solid rgba(212, 175, 55, 0.3)' : 'none',
          }}
        >
          <Clock size={13} /> Save within 24 hours — files expire after that
        </div>
        <br />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleShare}
            style={{
              marginTop: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '50px',
              border: isPremium ? '2px solid rgba(212, 175, 55, 0.5)' : '2px solid #BAE6FD',
              background: isPremium ? 'transparent' : 'rgba(186,230,253,0.2)',
              color: isPremium ? '#D4AF37' : '#3B82F6',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Share2 size={16} />
            {shareCopied ? 'Link Copied!' : 'Share Memories'}
          </button>

          <button
            disabled={isDownloadingAll}
            onClick={async () => {
              setIsDownloadingAll(true);
              const toDownload = [
                { url: finalDownloadUrl, name: 'SummerSplash_PhotoStrip.jpg' },
                ...(gifDownloadUrl ? [{ url: gifDownloadUrl, name: 'SummerSplash_Clip.gif' }] : []),
                ...(videoDownloadUrl
                  ? [{ url: videoDownloadUrl, name: 'SummerSplash_Video.mp4' }]
                  : []),
                ...shots.map((s, i) => ({
                  url: s.downloadUrl,
                  name: `SummerSplash_Shot_${i + 1}.jpg`,
                })),
              ];

              for (const item of toDownload) {
                try {
                  const resp = await fetch(item.url);
                  const blob = await resp.blob();
                  downloadBlob(blob, item.name);
                  await new Promise((r) => setTimeout(r, 500));
                } catch (e) {
                  console.error('Failed to download', item.name, e);
                }
              }
              setIsDownloadingAll(false);
            }}
            style={{
              marginTop: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '50px',
              border: 'none',
              background: isDownloadingAll
                ? '#475569'
                : isPremium
                  ? 'linear-gradient(135deg, #D4AF37, #92400E)'
                  : '#3B82F6',
              color: 'white',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: isDownloadingAll ? 'not-allowed' : 'pointer',
              boxShadow: isDownloadingAll
                ? 'none'
                : isPremium
                  ? '0 4px 15px rgba(212, 175, 55, 0.3)'
                  : '0 4px 12px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.2s',
              letterSpacing: isPremium ? '0.5px' : 'normal',
            }}
          >
            {isDownloadingAll ? (
              <>
                <div
                  className="spinner-mini"
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Downloading...
              </>
            ) : (
              <>
                <Download size={16} />
                Download All
              </>
            )}
          </button>
        </div>
      </header>

      <div
        className="content"
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '0 20px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Final Strip */}
        <div
          className="card"
          style={{
            background: isPremium ? 'rgba(30, 41, 59, 0.7)' : 'white',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: isPremium ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: isPremium ? '1px solid rgba(212, 175, 55, 0.2)' : 'none',
            backdropFilter: isPremium ? 'blur(10px)' : 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: '1.1rem',
              color: isPremium ? '#D4AF37' : '#1E3A5F',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Image size={18} /> Final Photo Strip
          </div>
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              background: isPremium ? '#0f172a' : '#F1F5F9',
            }}
          >
            <div style={{ position: 'relative', width: '100%', minHeight: '120px' }}>
              <div
                className={`skeleton${loadedImgs.has('final') ? ' skeleton-hidden' : ''}`}
                style={{ borderRadius: '12px' }}
              />
              <img
                src={finalUrl}
                alt="Final Strip"
                style={{
                  width: '100%',
                  display: 'block',
                  opacity: loadedImgs.has('final') ? 1 : 0,
                  transition: 'opacity 0.4s',
                }}
                onLoad={() => markLoaded('final')}
                onError={() => setFinalImgError(true)}
              />
            </div>
          </div>
          <a
            href={finalDownloadUrl}
            download="SummerSplash_PhotoStrip.jpg"
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 20px',
              borderRadius: '50px',
              border: 'none',
              background: isPremium ? 'linear-gradient(135deg, #D4AF37, #92400E)' : '#FACC15',
              color: isPremium ? '#fff' : '#92400E',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '1rem',
              boxShadow: isPremium
                ? '0 4px 15px rgba(212, 175, 55, 0.3)'
                : '0 4px 15px rgba(250, 204, 21, 0.3)',
              letterSpacing: isPremium ? '1px' : 'normal',
            }}
          >
            <Download size={16} /> Save Photo Strip
          </a>
        </div>

        {/* GIF Clip */}
        {gifUrl && (
          <div
            className="card"
            style={{
              background: isPremium ? 'rgba(30, 41, 59, 0.7)' : 'white',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: isPremium ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: isPremium ? '1px solid rgba(212, 175, 55, 0.2)' : 'none',
              backdropFilter: isPremium ? 'blur(10px)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '1.1rem',
                color: isPremium ? '#D4AF37' : '#1E3A5F',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Clapperboard size={18} /> GIF Clip
            </div>
            <div
              style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                background: isPremium ? '#0f172a' : '#F1F5F9',
              }}
            >
              <div style={{ position: 'relative', width: '100%', minHeight: '120px' }}>
                <div
                  className={`skeleton${loadedImgs.has('gif') ? ' skeleton-hidden' : ''}`}
                  style={{ borderRadius: '12px' }}
                />
                <img
                  src={gifUrl}
                  alt="GIF Clip"
                  style={{
                    width: '100%',
                    display: 'block',
                    opacity: loadedImgs.has('gif') ? 1 : 0,
                    transition: 'opacity 0.4s',
                  }}
                  onLoad={() => markLoaded('gif')}
                />
              </div>
            </div>
            <a
              href={gifDownloadUrl!}
              download="SummerSplash_Clip.gif"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 20px',
                borderRadius: '50px',
                border: 'none',
                background: isPremium
                  ? 'linear-gradient(135deg, #D4AF37, #92400E)'
                  : 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                color: 'white',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '1rem',
                boxShadow: isPremium
                  ? '0 4px 15px rgba(212, 175, 55, 0.3)'
                  : '0 4px 15px rgba(124, 58, 237, 0.3)',
                letterSpacing: isPremium ? '1px' : 'normal',
              }}
            >
              <Download size={16} /> Save GIF
            </a>
          </div>
        )}

        {/* Video */}
        {videoMp4Url && (
          <div
            className="card"
            style={{
              background: isPremium ? 'rgba(30, 41, 59, 0.7)' : 'white',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: isPremium ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: isPremium ? '1px solid rgba(212, 175, 55, 0.2)' : 'none',
              backdropFilter: isPremium ? 'blur(10px)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '1.1rem',
                color: isPremium ? '#D4AF37' : '#1E3A5F',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Film size={18} /> Action Video
            </div>
            <div
              style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'black',
                aspectRatio: '16/9',
                position: 'relative',
                cursor: 'pointer',
              }}
              role="button"
              tabIndex={0}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              onClick={togglePlay}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') togglePlay();
              }}
            >
              <video
                ref={videoRef}
                playsInline
                style={{ width: '100%', height: '100%', transform: 'scaleX(1)' }}
                onEnded={() => setIsPlaying(false)}
              >
                <source src={videoMp4Url} type="video/mp4" />
                <source src={videoWebmUrl!} type="video/webm" />
              </video>
              {!isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill={isPremium ? '#D4AF37' : '#3B82F6'}
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <a
              href={videoDownloadUrl || '#'}
              download="SummerSplash_Video.mp4"
              className="btn btn-blue"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px 20px',
                borderRadius: '50px',
                background: isPremium ? 'transparent' : '#3B82F6',
                border: isPremium ? '2px solid #D4AF37' : 'none',
                color: isPremium ? '#D4AF37' : 'white',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '1rem',
                boxShadow: isPremium ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.3)',
                letterSpacing: isPremium ? '1px' : 'normal',
              }}
            >
              <Download size={16} /> Save Video
            </a>
          </div>
        )}

        {/* Individual Shots */}
        <div
          className="card"
          style={{
            background: isPremium ? 'rgba(30, 41, 59, 0.7)' : 'white',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: isPremium ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: isPremium ? '1px solid rgba(212, 175, 55, 0.2)' : 'none',
            backdropFilter: isPremium ? 'blur(10px)' : 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'Fredoka, sans-serif',
              fontSize: '1.1rem',
              color: isPremium ? '#D4AF37' : '#1E3A5F',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Camera size={18} /> Individual Shots
          </div>
          <div
            className="shots-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
          >
            {shots.map((shot, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: isPremium ? '#0f172a' : '#F1F5F9',
                  border: isPremium ? '1px solid rgba(212, 175, 55, 0.1)' : 'none',
                }}
              >
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                  <div
                    className={`skeleton${loadedImgs.has(`shot${i}`) ? ' skeleton-hidden' : ''}`}
                    style={{ borderRadius: '0' }}
                  />
                  <img
                    src={shot.url}
                    alt={`Shot ${i + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      opacity: loadedImgs.has(`shot${i}`) ? 1 : 0,
                      transition: 'opacity 0.4s',
                      position: 'absolute',
                      inset: 0,
                    }}
                    onLoad={() => markLoaded(`shot${i}`)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                      markLoaded(`shot${i}`);
                    }}
                  />
                </div>
                <a
                  href={shot.downloadUrl}
                  download={`shot_${i + 1}_${sessionId}.jpg`}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    padding: '6px 10px',
                    fontSize: '0.7rem',
                    borderRadius: '8px',
                    background: isPremium ? 'rgba(15, 23, 42, 0.8)' : '#F1F5F9',
                    color: isPremium ? '#D4AF37' : '#3B82F6',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontFamily: 'Fredoka, sans-serif',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: isPremium ? '1px solid rgba(212, 175, 55, 0.3)' : 'none',
                  }}
                >
                  <Download size={12} /> Save
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer
        style={{
          marginTop: 'auto',
          padding: '30px',
          textAlign: 'center',
          color: isPremium ? '#94A3B8' : '#64748B',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <div style={{ maxWidth: '400px', opacity: 0.8, fontWeight: 500, lineHeight: '1.4' }}>
          <p style={{ marginBottom: '4px' }}>
            การเก็บรวบรวมและใช้ข้อมูลส่วนบุคคล (รูปภาพ)
            เป็นไปตามนโยบายความเป็นส่วนตัวเพื่อวัตถุประสงค์ในการให้บริการนี้เท่านั้น
            รูปภาพจะถูกลบอัตโนมัติภายใน 24 ชั่วโมง
          </p>
          <p style={{ fontSize: '0.75rem', color: isPremium ? '#64748B' : '#94A3B8' }}>
            Collection and use of personal data (photos) follows our privacy policy for service
            purposes only. Photos are automatically deleted within 24 hours.
          </p>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          Made with{' '}
          <Heart
            size={13}
            fill={isPremium ? '#D4AF37' : '#64748B'}
            color={isPremium ? '#D4AF37' : '#64748B'}
          />{' '}
          Photobooth 2026
        </div>
      </footer>
    </div>
  );
};

export default SummerSplashPage;
