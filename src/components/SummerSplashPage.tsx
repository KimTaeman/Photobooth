import React, { useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Film, Image, Camera, Share2, Heart, Clock, AlertCircle, Clapperboard, Home } from 'lucide-react';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';
import Stickers from './Stickers';
import { Link } from 'react-router-dom';

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
    const markLoaded = (key: string) => setLoadedImgs(prev => new Set(prev).add(key));
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);

    const getCloudinaryUrl = (suffix: string, isVideo = false, download = false) => {
        const type = isVideo ? 'video' : 'image';
        const resource = 'upload';
        const filename = isVideo ? 'SummerSplash_Video' : (suffix.includes('final') ? 'SummerSplash_PhotoStrip' : `SummerSplash_Shot`);
        const attachment = download ? `fl_attachment:${filename}/` : '';
        
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${type}/${resource}/${attachment}${sessionId}_${suffix}`;
    };

    const finalUrl = useMemo(() => getCloudinaryUrl('final.jpg'), [sessionId]);
    const finalDownloadUrl = useMemo(() => getCloudinaryUrl('final.jpg', false, true), [sessionId]);
    const gifUrl = useMemo(() => hasGif ? getCloudinaryUrl('clip.gif') : null, [sessionId, hasGif]);
    const gifDownloadUrl = useMemo(() => hasGif ? getCloudinaryUrl('clip.gif', false, true) : null, [sessionId, hasGif]);
    const videoMp4Url = useMemo(() => hasVideo ? getCloudinaryUrl('video.mp4', true) : null, [sessionId, hasVideo]);
    const videoWebmUrl = useMemo(() => hasVideo ? getCloudinaryUrl('video.webm', true) : null, [sessionId, hasVideo]);
    const videoDownloadUrl = useMemo(() => hasVideo ? getCloudinaryUrl('video.mp4', true, true) : null, [sessionId, hasVideo]);

    const shots = useMemo(() => [1, 2, 3, 4].map(num => ({
        url: getCloudinaryUrl(`shot_${num}.jpg`),
        downloadUrl: getCloudinaryUrl(`shot_${num}.jpg`, false, true)
    })), [sessionId]);

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: 'Summer Splash 2026 – My Memories', url });
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
            <div className="summer-splash-page" style={{
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
                overflow: 'hidden'
            }}>
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
                        background: 'rgba(59, 130, 246, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#3B82F6',
                        marginBottom: '8px'
                    }}>
                        <Clock size={48} strokeWidth={1.5} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#1E3A5F', fontSize: '1.8rem', margin: 0 }}>
                            Memories Expired
                        </h1>
                        <p style={{ color: '#64748B', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                            Oops! It looks like this session has expired or is no longer available.
                        </p>
                    </div>

                    <div style={{
                        background: 'rgba(254, 249, 195, 0.6)',
                        padding: '16px 20px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        textAlign: 'left',
                        border: '1px solid rgba(250, 204, 21, 0.3)'
                    }}>
                        <AlertCircle size={20} color="#92400E" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ color: '#92400E', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                            For privacy and storage, all photobooth memories are permanently deleted 24 hours after capture.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
                        <Link to="/" className="btn btn-primary btn-lg" style={{
                            textDecoration: 'none',
                            width: '100%',
                            fontSize: '1rem'
                        }}>
                            <Home size={18} /> Go to Photobooth
                        </Link>
                    </div>
                    
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', width: '100%', paddingTop: '10px' }}>
                        <p style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Camera size={14} /> Summer Splash 2026
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="summer-splash-page" style={{
            background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
            minHeight: '100vh',
            height: '100vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'Nunito, sans-serif',
            position: 'fixed',
            inset: 0,
            zIndex: 1000
        }}>
            <header style={{
                width: '100%',
                padding: '40px 20px 20px',
                textAlign: 'center',
                background: 'white',
                borderBottomLeftRadius: '40px',
                borderBottomRightRadius: '40px',
                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.05)',
                marginBottom: '20px'
            }}>
                <h1 style={{ fontFamily: 'Fredoka, sans-serif', color: '#3B82F6', margin: 0, fontSize: '1.8rem' }}>
                    Summer Splash 2026
                </h1>
                <p style={{ color: '#64748B', marginTop: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                    Your Memories are Ready!
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '6px 14px', borderRadius: '50px', background: '#FEF9C3', color: '#92400E', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Clock size={13} /> Save within 24 hours — files expire after that
                </div>
                <br />
                <button onClick={handleShare} style={{
                    marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', borderRadius: '50px', border: '2px solid #BAE6FD',
                    background: 'rgba(186,230,253,0.2)', color: '#3B82F6',
                    fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.95rem',
                    cursor: 'pointer'
                }}>
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
                            ...(videoDownloadUrl ? [{ url: videoDownloadUrl, name: 'SummerSplash_Video.mp4' }] : []),
                            ...shots.map((s, i) => ({ url: s.downloadUrl, name: `SummerSplash_Shot_${i + 1}.jpg` }))
                        ];

                        for (const item of toDownload) {
                            try {
                                const resp = await fetch(item.url);
                                const blob = await resp.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = item.name;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                                await new Promise(r => setTimeout(r, 500));
                            } catch (e) {
                                console.error('Failed to download', item.name, e);
                            }
                        }
                        setIsDownloadingAll(false);
                    }} 
                    style={{
                        marginTop: '14px', marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', borderRadius: '50px', border: 'none',
                        background: isDownloadingAll ? '#94A3B8' : '#3B82F6', 
                        color: 'white',
                        fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize: '0.95rem',
                        cursor: isDownloadingAll ? 'not-allowed' : 'pointer', 
                        boxShadow: isDownloadingAll ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.2)',
                        transition: 'all 0.2s'
                    }}
                >
                    {isDownloadingAll ? (
                        <>
                            <div className="spinner-mini" style={{
                                width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite'
                            }} />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            Download All
                        </>
                    )}
                </button>
            </header>

            <div className="content" style={{ width: '100%', maxWidth: '500px', padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Final Strip */}
                <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Image size={18} /> Final Photo Strip</div>
                    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9' }}>
                        <div style={{ position: 'relative', width: '100%', minHeight: '120px' }}>
                            <div className={`skeleton${loadedImgs.has('final') ? ' skeleton-hidden' : ''}`} style={{ borderRadius: '12px' }} />
                            <img src={finalUrl} alt="Final Strip" style={{ width: '100%', display: 'block', opacity: loadedImgs.has('final') ? 1 : 0, transition: 'opacity 0.4s' }} onLoad={() => markLoaded('final')} onError={() => setFinalImgError(true)} />
                        </div>
                    </div>
                    <a href={finalDownloadUrl} download="SummerSplash_PhotoStrip.jpg" className="btn btn-primary" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '16px 20px', borderRadius: '50px', border: 'none',
                        background: '#FACC15', color: '#92400E', fontFamily: 'Fredoka, sans-serif', fontWeight: 600,
                        textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 15px rgba(250, 204, 21, 0.3)'
                    }}>
                        <Download size={16} /> Save Photo Strip
                    </a>
                </div>

                {/* GIF Clip */}
                {gifUrl && (
                    <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Clapperboard size={18} /> GIF Clip</div>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9' }}>
                            <div style={{ position: 'relative', width: '100%', minHeight: '120px' }}>
                                <div className={`skeleton${loadedImgs.has('gif') ? ' skeleton-hidden' : ''}`} style={{ borderRadius: '12px' }} />
                                <img src={gifUrl} alt="GIF Clip" style={{ width: '100%', display: 'block', opacity: loadedImgs.has('gif') ? 1 : 0, transition: 'opacity 0.4s' }} onLoad={() => markLoaded('gif')} />
                            </div>
                        </div>
                        <a href={gifDownloadUrl!} download="SummerSplash_Clip.gif" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '16px 20px', borderRadius: '50px', border: 'none',
                            background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', color: 'white',
                            fontFamily: 'Fredoka, sans-serif', fontWeight: 600,
                            textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
                        }}>
                            <Download size={16} /> Save GIF
                        </a>
                    </div>
                )}

                {/* Video */}
                {videoMp4Url && (
                    <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Film size={18} /> Action Video</div>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: 'black', aspectRatio: '16/9', position: 'relative', cursor: 'pointer' }} onClick={togglePlay}>
                            <video ref={videoRef} playsInline style={{ width: '100%', height: '100%', transform: 'scaleX(1)' }} onEnded={() => setIsPlaying(false)}>
                                <source src={videoMp4Url} type="video/mp4" />
                                <source src={videoWebmUrl!} type="video/webm" />
                            </video>
                            {!isPlaying && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                    }}>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="#3B82F6">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                        <a href={videoDownloadUrl || '#'} download="SummerSplash_Video.mp4" className="btn btn-blue" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '16px 20px', borderRadius: '50px', border: 'none',
                            background: '#3B82F6', color: 'white', fontFamily: 'Fredoka, sans-serif', fontWeight: 600,
                            textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                        }}>
                            <Download size={16} /> Save Video
                        </a>
                    </div>
                )}

                {/* Individual Shots */}
                <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={18} /> Individual Shots</div>
                    <div className="shots-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {shots.map((shot, i) => (
                            <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#F1F5F9' }}>
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                                    <div className={`skeleton${loadedImgs.has(`shot${i}`) ? ' skeleton-hidden' : ''}`} style={{ borderRadius: '0' }} />
                                    <img 
                                        src={shot.url} 
                                        alt={`Shot ${i + 1}`} 
                                        style={{ 
                                            width: '100%', height: '100%', objectFit: 'cover', display: 'block', 
                                            opacity: loadedImgs.has(`shot${i}`) ? 1 : 0, transition: 'opacity 0.4s', 
                                            position: 'absolute', inset: 0
                                        }} 
                                        onLoad={() => markLoaded(`shot${i}`)} 
                                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; markLoaded(`shot${i}`); }} 
                                    />
                                </div>
                                <a href={shot.downloadUrl} download={`shot_${i + 1}_${sessionId}.jpg`} style={{
                                    position: 'absolute', bottom: '8px', right: '8px', padding: '6px 10px',
                                    fontSize: '0.7rem', borderRadius: '8px', background: '#F1F5F9',
                                    color: '#3B82F6', textDecoration: 'none', fontWeight: 700, fontFamily: 'Fredoka, sans-serif',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <Download size={12} /> Save
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <footer style={{ marginTop: 'auto', padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                Made with <Heart size={13} fill="#64748B" /> Photobooth 2026
            </footer>
        </div>
    );
};

export default SummerSplashPage;
