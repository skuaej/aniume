import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import api from '../api';

const HeroSlider = () => {
    const [slides, setSlides] = useState([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isAnimating, setIsAnimating] = useState(false);
    const timerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/api/sliders').then(res => {
            if (res.data && res.data.length > 0) {
                setSlides(res.data);
            }
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const goTo = useCallback((idx) => {
        if (isAnimating || idx === current || slides.length === 0) return;
        setIsAnimating(true);
        setCurrent(idx);
        setTimeout(() => setIsAnimating(false), 600);
    }, [isAnimating, current, slides.length]);

    const next = useCallback(() => goTo((current + 1) % slides.length), [goTo, current, slides.length]);
    const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [goTo, current, slides.length]);

    // Auto-advance every 5 seconds
    useEffect(() => {
        if (slides.length <= 1) return;
        timerRef.current = setInterval(next, 5000);
        return () => clearInterval(timerRef.current);
    }, [next, slides.length]);

    const handleSlideClick = (link) => {
        if (!link) return;
        if (link.startsWith('http')) {
            window.open(link, '_blank');
        } else {
            navigate(link);
        }
    };

    if (loading || slides.length === 0) return null;

    const slide = slides[current];

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '480px',
            overflow: 'hidden',
            borderRadius: '16px',
            marginBottom: '40px',
            cursor: 'pointer',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
        onClick={() => handleSlideClick(slide.link)}
        >
            {/* Slides */}
            {slides.map((s, i) => (
                <div
                    key={s._id}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: i === current ? 1 : 0,
                        transition: 'opacity 0.6s ease',
                        zIndex: i === current ? 1 : 0,
                    }}
                >
                    <img
                        src={s.image}
                        alt={s.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/1280x480/141417/ffffff?text=Slide'; }}
                        referrerPolicy="no-referrer"
                    />
                    {/* Gradient overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                    }} />
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                    }} />
                </div>
            ))}

            {/* Content overlay */}
            <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '40px 50px',
                zIndex: 10,
            }}>
                <div style={{
                    transform: isAnimating ? 'translateY(10px)' : 'translateY(0)',
                    opacity: isAnimating ? 0 : 1,
                    transition: 'all 0.4s ease',
                }}>
                    {slide.title && (
                        <h2 style={{
                            fontSize: 'clamp(1.5rem, 3vw, 2.8rem)',
                            fontWeight: '800',
                            marginBottom: '8px',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            maxWidth: '600px',
                        }}>{slide.title}</h2>
                    )}
                    {slide.subtitle && (
                        <p style={{
                            color: 'rgba(255,255,255,0.75)',
                            fontSize: '1rem',
                            marginBottom: '20px',
                            maxWidth: '500px',
                        }}>{slide.subtitle}</p>
                    )}
                    {slide.link && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSlideClick(slide.link); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--accent)',
                                border: 'none',
                                color: 'white',
                                padding: '12px 28px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            <Play size={18} fill="white" />
                            Watch Now
                        </button>
                    )}
                </div>

                {/* Dot indicators */}
                {slides.length > 1 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '50px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                    }}>
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                                style={{
                                    width: i === current ? '28px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: i === current ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    padding: 0,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Navigation arrows (only if >1 slide) */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        style={{
                            position: 'absolute', left: '15px', top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'white', borderRadius: '50%',
                            width: '44px', height: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 20,
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(229,9,20,0.7)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        style={{
                            position: 'absolute', right: '15px', top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'white', borderRadius: '50%',
                            width: '44px', height: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 20,
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(229,9,20,0.7)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}
        </div>
    );
};

export default HeroSlider;
