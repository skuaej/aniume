import React from 'react';
import { Link } from 'react-router-dom';
import { Popcorn, Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer style={{ 
            marginTop: '80px', 
            padding: '60px 0 30px', 
            borderTop: '1px solid var(--border)',
            background: 'rgba(10,10,12,0.8)',
            backdropFilter: 'blur(20px)'
        }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '40px' }}>
                    {/* Brand Info */}
                    <div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent)', marginBottom: '16px' }}>
                            <Popcorn size={28} fill="var(--accent)" />
                            <span>MIZOFY</span>
                        </Link>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '300px' }}>
                            Discover and stream the world's most popular anime in high quality. Join our growing community of anime lovers.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>Navigation</h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            <li><Link to="/" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>Home</Link></li>
                            <li><Link to="/" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>Trending Anime</Link></li>
                            <li><Link to="/" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}>Recently Added</Link></li>
                        </ul>
                    </div>

                    {/* Disclaimer */}
                    <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px' }}>Disclaimer</h4>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            Mizofy does not store any files on its server. All contents are provided by non-affiliated third parties.
                        </p>
                    </div>
                </div>

                <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.05)', 
                    paddingTop: '30px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '20px' 
                }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        &copy; {new Date().getFullYear()} Mizofy. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        Made with <Heart size={14} fill="var(--accent)" color="transparent" /> for Anime Fans
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
