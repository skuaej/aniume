import React, { useEffect, useState } from 'react';
import api from '../api';
import { Camera, Send, ExternalLink } from 'lucide-react';

const SocialLinksSection = () => {
    const [socials, setSocials] = useState([]);

    useEffect(() => {
        api.get('/api/socials').then(res => setSocials(res.data)).catch(() => {});
    }, []);

    if (socials.length === 0) return null;

    return (
        <section style={{ marginBottom: '50px', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '4px', height: '24px', background: 'var(--accent)', borderRadius: '2px' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Join Our Community</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {socials.map(s => (
                    <a 
                        key={s._id}
                        href={s.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px 24px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            minWidth: '200px'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(229,9,20,0.1)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div style={{ 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '12px', 
                            background: s.platform.toLowerCase().includes('telegram') ? '#229ED9' : '#E4405F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            {s.platform.toLowerCase().includes('telegram') ? <Send size={24} /> : <Camera size={24} />}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>{s.platform}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Follow for updates</div>
                        </div>
                        <ExternalLink size={16} color="var(--text-dim)" />
                    </a>
                 ))}
            </div>
        </section>
    );
};

export default SocialLinksSection;
