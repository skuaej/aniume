import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, ChevronLeft, ChevronRight, Settings, Maximize } from 'lucide-react';

const Watch = () => {
    const { id } = useParams();
    const location = useLocation();
    const hash = new URLSearchParams(location.search).get('hash');
    const navigate = useNavigate();
    
    const [episode, setEpisode] = useState(null);
    const [anime, setAnime] = useState(null);
    const [loading, setLoading] = useState(true);
    const videoRef = useRef(null);

    useEffect(() => {
        const fetchEpisode = async () => {
            try {
                // We need the episode details and the context (anime) for next/prev
                const animeRes = await api.get(`/api/anime-by-ep/${id}`);
                setAnime(animeRes.data);
                setEpisode(animeRes.data.episodes.find(e => e._id === id));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEpisode();
    }, [id]);

    // Handle "Continue Watching"
    useEffect(() => {
        if (videoRef.current && episode) {
            const savedTime = localStorage.getItem(`watch_${id}`);
            if (savedTime) {
                videoRef.current.currentTime = parseFloat(savedTime);
            }

            const interval = setInterval(() => {
                if (videoRef.current) {
                    localStorage.setItem(`watch_${id}`, videoRef.current.currentTime);
                }
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [id, episode]);

    if (loading) return <div className="container">Loading player...</div>;
    if (!episode) return <div className="container">Error loading episode.</div>;

    const streamUrl = `${api.defaults.baseURL}/api/watch/${id}?hash=${hash}`;

    return (
        <div className="container" style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link to={`/anime/${anime?.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)' }}>
                    <ArrowLeft size={18} />
                    Back to Anime
                </Link>
                <div style={{ padding: '4px 12px', background: 'var(--accent)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    EP {episode.episode_number}
                </div>
                <h2 style={{ fontSize: '1.2rem' }}>{episode.title}</h2>
            </div>

            <div className="player-container" style={{ position: 'relative', width: '100%', background: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
                <video 
                    ref={videoRef}
                    src={streamUrl} 
                    controls 
                    autoPlay 
                    playsInline
                    crossOrigin="anonymous"
                    style={{ width: '100%', aspectRatio: '16/9' }}
                />
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                   {/* Prev/Next buttons logic */}
                </div>
                
                <div style={{ color: 'var(--text-dim)' }}>
                    Auto-save enabled. Resuming from last watched position.
                </div>
            </div>
        </div>
    );
};

export default Watch;
