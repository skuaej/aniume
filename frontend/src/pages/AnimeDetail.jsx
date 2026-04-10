import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { PlayCircle, Info, Calendar, Share2, Link2, MessageCircle, Send, Check } from 'lucide-react';

const AnimeDetail = () => {
    const { slug } = useParams();
    const [anime, setAnime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await api.get(`/api/anime/${slug}`);
                setAnime(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [slug]);

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="container">Loading...</div>;
    if (!anime) return <div className="container">Anime not found.</div>;

    const mainShareUrl = window.location.href;
    const mainShareText = `Checkout ${anime.title} on Mizofy! 🍿`;

    return (
        <div className="container" style={{ paddingBottom: '50px' }}>
            <div className="hero-section" style={{ display: 'flex', gap: '40px', marginTop: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 300px', maxWidth: '100%' }}>
                    <img 
                        src={anime.poster || 'https://via.placeholder.com/300x450/141417/ffffff?text=No+Poster'} 
                        alt={anime.title} 
                        style={{ width: '100%', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                </div>
                
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '900', marginBottom: '15px', letterSpacing: '-1px' }}>{anime.title}</h1>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={16} />
                            <span>{new Date(anime.created_at).getFullYear()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PlayCircle size={16} />
                            <span>{anime.episodes.length} Episodes</span>
                        </div>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '35px', maxWidth: '700px' }}>
                        {anime.description || 'No description available for this title.'}
                    </p>

                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {anime.episodes.length > 0 && (
                            <Link to={`/watch/${anime.episodes[0]._id}?hash=${anime.episodes[0].watch_url.split('hash=')[1]}`} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 25px' }}>
                                <PlayCircle size={20} fill="white" />
                                Start Watching
                            </Link>
                        )}
                        <button 
                            onClick={() => handleCopy(mainShareUrl)}
                            className="btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', padding: '12px 25px' }}
                        >
                            {copied ? <Check size={20} color="var(--accent)" /> : <Share2 size={20} />}
                            {copied ? 'Link Copied!' : 'Share Series'}
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '60px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', borderBottom: '2px solid var(--border)', paddingBottom: '12px', marginBottom: '25px' }}>Episodes</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {anime.episodes.map(ep => {
                        const epUrl = `${window.location.origin}/watch/${ep._id}?hash=${ep.watch_url.split('hash=')[1]}`;
                        const epShareText = `Watch ${anime.title} Episode ${ep.episode_number} on Mizofy! 🍿`;
                        const epTgLink = `https://t.me/share/url?url=${encodeURIComponent(epUrl)}&text=${encodeURIComponent(epShareText)}`;

                        return (
                            <div 
                                key={ep._id} 
                                className="glass"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    transition: 'all 0.2s',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    gap: '15px'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-glass)'}
                            >
                                <span style={{ color: 'var(--accent)', fontWeight: '800', width: '40px', fontSize: '1.1rem' }}>{ep.episode_number}</span>
                                <Link to={`/watch/${ep._id}?hash=${ep.watch_url.split('hash=')[1]}`} style={{ flex: 1, textDecoration: 'none', color: 'white', fontWeight: '600' }}>
                                    {ep.title}
                                </Link>
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <a href={epTgLink} target="_blank" rel="noreferrer" title="Share Episode on Telegram" style={{ color: 'var(--text-dim)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                                        <Send size={18} />
                                    </a>
                                    <button onClick={() => handleCopy(epUrl)} title="Copy Episode Link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                                        <Link2 size={18} />
                                    </button>
                                    <Link to={`/watch/${ep._id}?hash=${ep.watch_url.split('hash=')[1]}`} title="Watch Now" style={{ color: 'var(--text-dim)', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                                        <PlayCircle size={20} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnimeDetail;
