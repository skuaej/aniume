import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Popcorn } from 'lucide-react';

const Navbar = () => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 100, marginBottom: '20px' }}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '-0.5px' }}>
                    <Popcorn size={28} fill="var(--accent)" />
                    <span>MIZOFY</span>
                </Link>

                <form onSubmit={handleSearch} className="search-form" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <input 
                        type="text" 
                        placeholder="Search anime..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="search-input"
                        style={{
                            width: '100%',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border)',
                            padding: '12px 15px 12px 45px',
                            borderRadius: '30px',
                            color: 'white',
                            outline: 'none',
                            fontSize: '0.95rem',
                            transition: 'all 0.3s ease'
                        }}
                    />
                    <Search 
                        size={20} 
                        style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', transition: 'color 0.3s' }} 
                        className="search-icon"
                    />
                </form>

                <div style={{ display: 'flex', gap: '20px', color: 'var(--text-dim)', fontWeight: '500' }}>
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/" className="nav-link">Movies</Link>
                    <Link to="/" className="nav-link">New</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
