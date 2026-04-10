import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../api';
import { Play } from 'lucide-react';
import HeroSlider from '../components/HeroSlider';
import Top5Section from '../components/Top5Section';
import SocialLinksSection from '../components/SocialLinksSection';

const CATEGORY_ALL = 'All';

const Home = () => {
    const [animes, setAnimes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCat, setSelectedCat] = useState(CATEGORY_ALL);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const query = new URLSearchParams(location.search).get('q');

    // Fetch categories on mount
    useEffect(() => {
        api.get('/api/categories').then(res => {
            setCategories([CATEGORY_ALL, ...res.data]);
        }).catch(() => {});
    }, []);

    const fetchAnimes = async () => {
        setLoading(true);
        try {
            let url = '/api/search';
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (selectedCat && selectedCat !== CATEGORY_ALL) params.set('category', selectedCat);
            const qs = params.toString();
            if (qs) url += '?' + qs;
            const res = await api.get(url);
            let data = res.data;
            if (!query) {
                data = data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10);
            }
            setAnimes(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnimes(); }, [query, selectedCat]);

    return (
        <div className="container">
            {/* Hero Slider - only shown on homepage (no search query) */}
            {!query && (
                <>
                    <HeroSlider />
                    <Top5Section />
                    <SocialLinksSection />
                </>
            )}

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>
                    {query ? `Results for "${query}"` : 'Latest Releases'}
                </h2>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{animes.length} titles</span>
            </div>

            {/* Category filter tabs - only on home (no search) */}
            {!query && categories.length > 1 && (
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap',
                    marginBottom: '24px', padding: '4px 0',
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCat(cat)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '20px',
                                border: `1px solid ${selectedCat === cat ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                                background: selectedCat === cat ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontWeight: selectedCat === cat ? '700' : '400',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                    Loading...
                </div>
            ) : (
                <div className="grid">
                    {animes.length > 0 ? animes.map(anime => (
                        <Link to={`/anime/${anime.slug}`} key={anime._id} className="card">
                            <div className="poster-wrapper">
                                <img
                                    src={anime.poster || 'https://via.placeholder.com/300x450/141417/ffffff?text=No+Poster'}
                                    alt={anime.title}
                                    className="poster"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                />
                                <div className="card-info">
                                    <h3 className="card-title">{anime.title}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                        <Play size={14} fill="currentColor" />
                                        <span>{anime.episodes?.length || 0} Episodes</span>
                                        {anime.category && anime.category !== 'Uncategorized' && (
                                            <span style={{
                                                marginLeft: '6px', padding: '1px 8px',
                                                background: 'rgba(229,9,20,0.2)',
                                                borderRadius: '4px', fontSize: '0.75rem',
                                                color: 'var(--accent)',
                                            }}>{anime.category}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
                            No anime found. {!query && 'Start by forwarding a video to the bot!'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Home;
