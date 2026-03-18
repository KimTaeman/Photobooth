import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Film, Image, Camera, Share2, Heart, Clock, AlertCircle } from 'lucide-react';
import { CLOUDINARY_CLOUD_NAME } from '../hooks/useCloudinary';

const SummerSplashPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('id');
    const hasVideo = searchParams.get('v') === '1';

    if (!sessionId) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
                <div>
                    <h1 style={{ color: '#3B82F6', fontFamily: 'Fredoka, sans-serif' }}>Oops!</h1>
                    <p style={{ color: '#64748B' }}>We couldn't find your session. Please try scanning the QR code again.</p>
                </div>
            </div>
        );
    }

    const getCloudinaryUrl = (suffix: string, isVideo = false, download = false) => {
        const type = isVideo ? 'video' : 'image';
        const resource = 'upload';
        const filename = isVideo ? 'SummerSplash_Video' : (suffix.includes('final') ? 'SummerSplash_PhotoStrip' : `SummerSplash_Shot`);
        const attachment = download ? `fl_attachment:${filename}/` : '';
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${type}/${resource}/${attachment}${sessionId}_${suffix}`;
    };

    const finalUrl = getCloudinaryUrl('final.jpg');
    const finalDownloadUrl = getCloudinaryUrl('final.jpg', false, true);
    const videoMp4Url = hasVideo ? getCloudinaryUrl('video.mp4', true) : null;
    const videoWebmUrl = hasVideo ? getCloudinaryUrl('video.webm', true) : null;
    const videoDownloadUrl = hasVideo ? getCloudinaryUrl('video.mp4', true, true) : null;

    const shots = [1, 2, 3, 4].map(num => ({
        url: getCloudinaryUrl(`shot_${num}.jpg`),
        downloadUrl: getCloudinaryUrl(`shot_${num}.jpg`, false, true)
    }));

    const [isPlaying, setIsPlaying] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [finalImgError, setFinalImgError] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

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

    if (finalImgError) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px', flexDirection: 'column', gap: '16px' }}>
                <AlertCircle size={48} color="#EF4444" />
                <h2 style={{ color: '#1E3A5F', fontFamily: 'Fredoka, sans-serif' }}>Session Not Found</h2>
                <p style={{ color: '#64748B', maxWidth: '300px' }}>This link may have expired or is invalid. Photos are only available for 24 hours after the session.</p>
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
            </header>

            <div className="content" style={{ width: '100%', maxWidth: '500px', padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Final Strip */}
                <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Image size={18} /> Final Photo Strip</div>
                    <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#F1F5F9' }}>
                        <img
                            src={finalUrl}
                            alt="Final Strip"
                            style={{ width: '100%', display: 'block' }}
                            onError={() => setFinalImgError(true)}
                        />
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

                {/* Video */}
                {videoMp4Url && (
                    <div className="card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: '8px' }}><Film size={18} /> Action Video</div>
                        <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: 'black', aspectRatio: '16/9', position: 'relative', cursor: 'pointer' }} onClick={togglePlay}>
                            <video ref={videoRef} playsInline style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }} onEnded={() => setIsPlaying(false)}>
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
                                <img
                                    src={shot.url}
                                    alt={`Shot ${i + 1}`}
                                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                                />
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
