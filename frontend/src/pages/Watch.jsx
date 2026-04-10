import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Maximize2 } from 'lucide-react';

const Watch = () => {
    const { id } = useParams();
    const location = useLocation();
    const hash = new URLSearchParams(location.search).get('hash');
    const navigate = useNavigate();

    const [episode, setEpisode] = useState(null);
    const [anime, setAnime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        const fetchEpisode = async () => {
            setLoading(true);
            setError(null);
            try {
                const animeRes = await api.get(`/api/anime-by-ep/${id}`);
                const data = animeRes.data;
                setAnime(data);
                // Find the current episode
                const currentEp = data.episodes.find(e => e._id === id);
                setEpisode(currentEp);
            } catch (err) {
                console.error('Failed to fetch episode details:', err);
                setError('Failed to load episode. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchEpisode();
    }, [id]);

    // Resume from last watched position ("Continue Watching")
    useEffect(() => {
        if (videoRef.current && episode) {
            const savedTime = localStorage.getItem(`watch_${id}`);
            if (savedTime && parseFloat(savedTime) > 5) {
                videoRef.current.currentTime = parseFloat(savedTime);
            }

            const interval = setInterval(() => {
                if (videoRef.current && !videoRef.current.paused) {
                    localStorage.setItem(`watch_${id}`, videoRef.current.currentTime);
                }
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [id, episode]);

    if (loading) return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
                <p style={{ color: 'var(--text-dim)' }}>Loading player...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
            <p style={{ color: '#ff6b6b', fontSize: '1.1rem', marginBottom: '20px' }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn">Retry</button>
        </div>
    );

    if (!episode) return (
        <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
            <p style={{ color: 'var(--text-dim)' }}>Episode not found.</p>
        </div>
    );

    // Build the stream URL:
    // - In dev: vite proxies /api/* to localhost:5000, so we use a relative path
    // - In production: VITE_API_BASE_URL env var points to the Koyeb backend
    const backendBase = import.meta.env.VITE_API_BASE_URL || '';
    const streamUrl = `${backendBase}/api/watch/${id}?hash=${hash}`;

    // Find prev/next episodes
    const sortedEps = [...(anime?.episodes || [])].sort((a, b) => a.episode_number - b.episode_number);
    const currentIdx = sortedEps.findIndex(e => e._id === id);
    const prevEp = currentIdx > 0 ? sortedEps[currentIdx - 1] : null;
    const nextEp = currentIdx < sortedEps.length - 1 ? sortedEps[currentIdx + 1] : null;

    return (
        <div className="container" style={{ padding: '20px 0', maxWidth: '1100px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                    to={`/anime/${anime?.slug}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.color = 'white'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
                >
                    <ArrowLeft size={18} />
                    Back
                </Link>
                <div style={{ padding: '3px 12px', background: 'var(--accent)', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                    EP {episode.episode_number}
                </div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, flex: 1 }}>{episode.title}</h1>
            </div>

            {/* Video Player */}
            <div
                className="player-container"
                style={{
                    position: 'relative',
                    width: '100%',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <video
                    ref={videoRef}
                    key={streamUrl} // re-mount video when URL changes
                    src={streamUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
                    onError={(e) => {
                        console.error('Video error:', e.target.error?.code, e.target.error?.message);
                        setError(`Video failed to load. Error code: ${e.target.error?.code || 'unknown'}. Please check backend logs.`);
                    }}
                    onLoadStart={() => console.log('Stream URL:', streamUrl)}
                />
            </div>

            {/* Navigation Controls */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {prevEp && (
                        <Link
                            to={`/watch/${prevEp._id}?hash=${prevEp.watch_url?.split('hash=')[1] || ''}`}
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                            <ChevronLeft size={16} />
                            EP {prevEp.episode_number}
                        </Link>
                    )}
                    {nextEp && (
                        <Link
                            to={`/watch/${nextEp._id}?hash=${nextEp.watch_url?.split('hash=')[1] || ''}`}
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.9rem' }}
                        >
                            EP {nextEp.episode_number}
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </div>

                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Volume2 size={14} />
                    Auto-resume enabled
                </div>
            </div>

            {/* Episode List */}
            {sortedEps.length > 1 && (
                <div style={{ marginTop: '40px' }}>
                    <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
                        All Episodes
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                        {sortedEps.map(ep => (
                            <Link
                                key={ep._id}
                                to={`/watch/${ep._id}?hash=${ep.watch_url?.split('hash=')[1] || ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: ep._id === id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${ep._id === id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                                    fontWeight: ep._id === id ? '700' : '400',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                    textDecoration: 'none',
                                    color: 'white',
                                }}
                                onMouseOver={e => { if (ep._id !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                                onMouseOut={e => { if (ep._id !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            >
                                {ep.episode_number}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Watch;
