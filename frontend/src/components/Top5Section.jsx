import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Trophy } from 'lucide-react';

const Top5Section = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/top5').then(res => {
            setItems(res.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading || items.length === 0) return null;

    return (
        <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Trophy size={22} color="var(--accent)" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Top 5 Recommendations</h2>
            </div>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '24px' 
            }}>
                {items.map((item, idx) => (
                    <Link 
                        key={item._id} 
                        to={item.link} 
                        style={{ 
                            position: 'relative',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            height: '280px',
                            display: 'block',
                            textDecoration: 'none',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.02) translateY(-10px)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(229,9,20,0.2)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
                        }}
                    >
                        <img 
                            src={item.image} 
                            alt={item.title} 
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                filter: 'brightness(0.7)'
                            }}
                            referrerPolicy="no-referrer"
                        />
                        <div style={{ 
                            position: 'absolute', 
                            bottom: '0', 
                            left: '0', 
                            right: '0', 
                            padding: '12px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '900', 
                                color: 'var(--accent)',
                                opacity: '0.8'
                            }}>#{idx + 1}</span>
                            <span style={{ 
                                color: 'white', 
                                fontWeight: '700', 
                                fontSize: '0.95rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{item.title}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default Top5Section;
