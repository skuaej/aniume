import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Lock, LogOut, Image, Film, Plus, Trash2, Edit3, Save, X,
    Search, ChevronDown, ChevronUp, Tag, ExternalLink, Upload,
    LayoutDashboard, Layers, Settings, AlertCircle, Check, Trophy, Info, Send
} from 'lucide-react';
import api from '../api';

// ─── helpers ────────────────────────────────────────────────────────────────
const TOKEN_KEY = '_adm_tok';
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

// ─── styled helpers ──────────────────────────────────────────────────────────
const card = {
    background: 'rgba(20,20,23,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '24px',
};
const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: 'white',
    padding: '10px 14px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
};
const btnPrimary = {
    background: 'var(--accent)',
    border: 'none', color: 'white',
    padding: '10px 20px', borderRadius: '8px',
    fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.9rem', transition: 'opacity 0.2s',
};
const btnDanger = {
    ...btnPrimary,
    background: 'rgba(229,9,20,0.2)',
    border: '1px solid rgba(229,9,20,0.4)',
    color: '#ff6b6b',
};
const btnGhost = {
    ...btnPrimary,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'white',
};

// ─── Toast notification ──────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
    <div style={{
        position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
        background: type === 'error' ? '#2d0a0a' : '#0a1f0a',
        border: `1px solid ${type === 'error' ? '#ff6b6b' : '#4ade80'}`,
        color: type === 'error' ? '#ff6b6b' : '#4ade80',
        borderRadius: '10px', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.3s ease',
        maxWidth: '360px',
    }}>
        {type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
        <span style={{ fontSize: '0.9rem', flex: 1 }}>{msg}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
        </button>
    </div>
);

// ─── Login Gate ──────────────────────────────────────────────────────────────
const LoginGate = ({ onLogin }) => {
    const [un, setUn] = useState('');
    const [pw, setPw] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErr('');
        setLoading(true);
        try {
            const res = await api.post('/api/admin/login', { username: un, password: pw });
            setToken(res.data.token);
            onLogin();
        } catch {
            setErr('Invalid credentials. Access denied.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{ ...card, width: '100%', maxWidth: '380px', textAlign: 'center' }}>
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: 'rgba(229,9,20,0.15)', border: '2px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                }}>
                    <Lock size={26} color="var(--accent)" />
                </div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '4px' }}>Admin Access</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '28px' }}>Restricted area</p>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <input
                        type="text" placeholder="Username" value={un}
                        onChange={e => setUn(e.target.value)}
                        style={inputStyle} autoComplete="username"
                    />
                    <input
                        type="password" placeholder="Password" value={pw}
                        onChange={e => setPw(e.target.value)}
                        style={inputStyle} autoComplete="current-password"
                    />
                    {err && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', textAlign: 'left' }}>{err}</p>}
                    <button type="submit" style={{ ...btnPrimary, justifyContent: 'center', padding: '12px' }}
                        disabled={loading}>
                        {loading ? 'Verifying...' : 'Enter Admin Panel'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ─── Slider Manager Tab ──────────────────────────────────────────────────────
const SliderTab = ({ toast }) => {
    const [sliders, setSliders] = useState([]);
    const [form, setForm] = useState({ image: '', link: '', title: '', subtitle: '', order: '', active: true });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchSliders = async () => {
        const res = await api.get('/api/admin/sliders', authHeaders());
        setSliders(res.data);
    };
    useEffect(() => { fetchSliders(); }, []);

    const handleSave = async () => {
        if (!form.image || !form.link) return toast('Image URL and Link are required', 'error');
        setSaving(true);
        try {
            if (editId) {
                await api.put(`/api/admin/sliders/${editId}`, form, authHeaders());
                toast('Slider updated ✓', 'success');
            } else {
                await api.post('/api/admin/sliders', form, authHeaders());
                toast('Slider added ✓', 'success');
            }
            setForm({ image: '', link: '', title: '', subtitle: '', order: '', active: true });
            setEditId(null);
            fetchSliders();
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to save slider', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (s) => {
        setEditId(s._id);
        setForm({ image: s.image, link: s.link, title: s.title || '', subtitle: s.subtitle || '', order: s.order, active: s.active });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this slide?')) return;
        try {
            await api.delete(`/api/admin/sliders/${id}`, authHeaders());
            toast('Slider deleted', 'success');
            fetchSliders();
        } catch {
            toast('Failed to delete', 'error');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Form */}
            <div style={card}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editId ? <><Edit3 size={18} /> Edit Slide</> : <><Plus size={18} /> Add New Slide</>}
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-dim)' }}>Max 5 slides</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Banner Image URL *</label>
                        <input style={inputStyle} placeholder="https://image.url/banner.jpg" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Redirect Link *</label>
                        <input style={inputStyle} placeholder="/anime/tokyo-ghoul-ddwek or https://..." value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Display Order (0–4)</label>
                        <input style={inputStyle} type="number" min="0" max="4" placeholder="0" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Title (overlay text)</label>
                        <input style={inputStyle} placeholder="Attack on Titan Season 4" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Subtitle</label>
                        <input style={inputStyle} placeholder="Stream the latest episodes now" value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} />
                    </div>
                </div>
                {form.image && (
                    <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', height: '120px' }}>
                        <img src={form.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" onError={e => e.target.style.display = 'none'} referrerPolicy="no-referrer" />
                    </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button style={btnPrimary} onClick={handleSave} disabled={saving}>
                        <Save size={16} /> {saving ? 'Saving...' : (editId ? 'Update Slide' : 'Add Slide')}
                    </button>
                    {editId && (
                        <button style={btnGhost} onClick={() => { setEditId(null); setForm({ image: '', link: '', title: '', subtitle: '', order: '', active: true }); }}>
                            <X size={16} /> Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Existing sliders */}
            <div style={card}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700' }}>Current Slides ({sliders.length}/5)</h3>
                {sliders.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>No slides yet. Add one above!</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sliders.map(s => (
                            <div key={s._id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <img src={s.image} style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} alt={s.title} onError={e => e.target.src = 'https://via.placeholder.com/120x60/141417/666?text=IMG'} referrerPolicy="no-referrer" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || '(No title)'}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.link}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Order: {s.order}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button style={btnGhost} onClick={() => handleEdit(s)}><Edit3 size={15} /></button>
                                    <button style={btnDanger} onClick={() => handleDelete(s._id)}><Trash2 size={15} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Top 5 Manager Tab ───────────────────────────────────────────────────────
const Top5Tab = ({ toast }) => {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({ image: '', link: '', title: '', order: '', active: true });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchItems = async () => {
        try {
            const res = await api.get('/api/admin/top5', authHeaders());
            setItems(res.data);
        } catch { toast('Failed to fetch Top 5', 'error'); }
    };
    useEffect(() => { fetchItems(); }, []);

    const handleSave = async () => {
        if (!form.image || !form.link) return toast('Image URL and Link are required', 'error');
        setSaving(true);
        try {
            if (editId) {
                await api.put(`/api/admin/top5/${editId}`, form, authHeaders());
                toast('Item updated ✓', 'success');
            } else {
                await api.post('/api/admin/top5', form, authHeaders());
                toast('Item added ✓', 'success');
            }
            setForm({ image: '', link: '', title: '', order: '', active: true });
            setEditId(null);
            fetchItems();
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to save item', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await api.delete(`/api/admin/top5/${id}`, authHeaders());
            toast('Item deleted ✓', 'success');
            fetchItems();
        } catch { toast('Failed to delete', 'error'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={card}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700' }}>
                    {editId ? 'Edit Item' : 'Add New Top 5 Item'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Direct Image URL *</label>
                        <input style={inputStyle} value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Redirect Link *</label>
                        <input style={inputStyle} value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="/anime/slug" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Title Label</label>
                        <input style={inputStyle} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Action" />
                    </div>
                </div>
                <button style={{ ...btnPrimary, marginTop: '16px' }} onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : (editId ? 'Update Item' : 'Add Item')}
                </button>
            </div>

            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Current Items</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{items.length} / 5</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(item => (
                        <div key={item._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <img src={item.image} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} referrerPolicy="no-referrer" alt="t5" />
                            <div style={{ flex: 1 }}>{item.title || '(No title)'}</div>
                            <button style={{ ...btnGhost, padding: '6px' }} onClick={() => { setEditId(item._id); setForm(item); }}><Edit3 size={14} /></button>
                            <button style={{ ...btnDanger, padding: '6px' }} onClick={() => handleDelete(item._id)}><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Social Links Manager Tab ────────────────────────────────────────────────
const SocialsTab = ({ toast }) => {
    const [socials, setSocials] = useState([]);
    const [form, setForm] = useState({ platform: '', url: '', active: true });
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchSocials = async () => {
        try {
            const res = await api.get('/api/admin/socials', authHeaders());
            setSocials(res.data);
        } catch { toast('Failed to fetch Socials', 'error'); }
    };
    useEffect(() => { fetchSocials(); }, []);

    const handleSave = async () => {
        if (!form.platform || !form.url) return toast('Platform and URL are required', 'error');
        setSaving(true);
        try {
            if (editId) {
                await api.put(`/api/admin/socials/${editId}`, form, authHeaders());
                toast('Social link updated ✓', 'success');
            } else {
                await api.post('/api/admin/socials', form, authHeaders());
                toast('Social link added ✓', 'success');
            }
            setForm({ platform: '', url: '', active: true });
            setEditId(null);
            fetchSocials();
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this social link?')) return;
        try {
            await api.delete(`/api/admin/socials/${id}`, authHeaders());
            toast('Social link deleted ✓', 'success');
            fetchSocials();
        } catch { toast('Failed to delete', 'error'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={card}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: '700' }}>
                    {editId ? 'Edit Social Link' : 'Add New Social Link'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Platform Name *</label>
                        <input style={inputStyle} value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} placeholder="Telegram or Instagram" />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>URL *</label>
                        <input style={inputStyle} value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." />
                    </div>
                </div>
                <button style={{ ...btnPrimary, marginTop: '16px' }} onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : (editId ? 'Update Link' : 'Add Link')}
                </button>
            </div>

            <div style={card}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px' }}>Current Social Links</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {socials.map(s => (
                        <div key={s._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={20} />
                            </div>
                            <div style={{ flex: 1 }}>{s.platform}</div>
                            <button style={{ ...btnGhost, padding: '6px' }} onClick={() => { setEditId(s._id); setForm(s); }}><Edit3 size={14} /></button>
                            <button style={{ ...btnDanger, padding: '6px' }} onClick={() => handleDelete(s._id)}><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Anime Manager Tab ───────────────────────────────────────────────────────
const CATEGORIES = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Uncategorized'];

const AnimeRow = ({ anime: initialAnime, toast, onDelete }) => {
    const [anime, setAnime] = useState(initialAnime);
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(anime.title || '');
    const [desc, setDesc] = useState(anime.description || '');
    const [posterUrl, setPosterUrl] = useState(anime.poster || '');
    const [category, setCategory] = useState(anime.category || 'Uncategorized');
    const [newEp, setNewEp] = useState({ episode_number: '', title: '', media_url: '', file_id: '', message_id: '', chat_id: '' });
    const [editingEp, setEditingEp] = useState(null); // The ID of the episode being edited
    const [saving, setSaving] = useState(false);
    const [epType, setEpType] = useState('url'); // 'url' or 'telegram'
    const id = anime._id;

    const startEditingEp = (ep) => {
        setEditingEp(ep._id);
        setNewEp({
            episode_number: ep.episode_number,
            title: ep.title || '',
            media_url: ep.media_url || '',
            file_id: ep.file_id || '',
            message_id: ep.message_id || '',
            chat_id: ep.chat_id || ''
        });
        setEpType(ep.media_url ? 'url' : 'telegram');
    };

    const cancelEditingEp = () => {
        setEditingEp(null);
        setNewEp({ episode_number: '', title: '', media_url: '', file_id: '', message_id: '', chat_id: '' });
    };

    const updateEpisode = async () => {
        if (!newEp.episode_number) return toast('Episode number is required', 'error');
        setSaving(true);
        try {
            await api.put(`/api/admin/anime/${id}/episode/${editingEp}`, newEp, authHeaders());
            toast(`Episode ${newEp.episode_number} updated ✓`, 'success');
            setEditingEp(null);
            setNewEp({ episode_number: '', title: '', media_url: '', file_id: '', message_id: '', chat_id: '' });
            await refreshAnime();
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to update episode', 'error');
        } finally { setSaving(false); }
    };

    const refreshAnime = async () => {
        try {
            const res = await api.get(`/api/admin/anime?q=${encodeURIComponent(title)}`, authHeaders());
            const updated = res.data.find(a => a._id === id);
            if (updated) {
                setAnime(updated);
                setTitle(updated.title);
                setDesc(updated.description);
                setPosterUrl(updated.poster);
                setCategory(updated.category);
            }
        } catch {}
    };

    const updateTitleInfo = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/anime/${id}`, { title, description: desc }, authHeaders());
            toast('Title & Info updated ✓', 'success');
        } catch { toast('Failed to update anime info', 'error'); }
        finally { setSaving(false); }
    };

    const updatePoster = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/anime/${id}/poster`, { poster: posterUrl }, authHeaders());
            toast('Poster updated ✓', 'success');
            setAnime(p => ({ ...p, poster: posterUrl }));
        } catch { toast('Failed to update poster', 'error'); }
        finally { setSaving(false); }
    };

    const updateCategory = async () => {
        setSaving(true);
        try {
            await api.put(`/api/admin/anime/${id}/category`, { category }, authHeaders());
            toast('Category updated ✓', 'success');
            setAnime(p => ({ ...p, category }));
        } catch { toast('Failed to update category', 'error'); }
        finally { setSaving(false); }
    };

    const deleteEpisode = async (epId, epTitle) => {
        if (!window.confirm(`Delete "${epTitle}"?`)) return;
        try {
            await api.delete(`/api/admin/anime/${id}/episode/${epId}`, authHeaders());
            toast('Episode deleted ✓', 'success');
            await refreshAnime();
        } catch { toast('Failed to delete episode', 'error'); }
    };

    const addEpisode = async () => {
        if (!newEp.episode_number) return toast('Episode number is required', 'error');
        setSaving(true);
        try {
            const body = {
                episode_number: Number(newEp.episode_number),
                title: newEp.title || `${anime.title} Episode ${newEp.episode_number}`,
            };
            if (epType === 'url') {
                if (!newEp.media_url) return toast('Media URL is required', 'error');
                body.media_url = newEp.media_url;
                body.file_id = newEp.media_url;
            } else {
                body.file_id = newEp.file_id;
                body.message_id = Number(newEp.message_id);
                body.chat_id = newEp.chat_id;
            }
            await api.post(`/api/admin/anime/${id}/episode`, body, authHeaders());
            toast(`Episode ${newEp.episode_number} added ✓`, 'success');
            setNewEp({ episode_number: '', title: '', media_url: '', file_id: '', message_id: '', chat_id: '' });
            await refreshAnime();
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to add episode', 'error');
        } finally { setSaving(false); }
    };

    const deleteAnime = async () => {
        if (!window.confirm(`Delete ALL of "${anime.title}" and its ${anime.episodes.length} episodes? This cannot be undone!`)) return;
        try {
            await api.delete(`/api/admin/anime/${id}`, authHeaders());
            toast(`"${anime.title}" deleted`, 'success');
            onDelete(id);
        } catch { toast('Failed to delete anime', 'error'); }
    };

    const sortedEps = [...(anime.episodes || [])].sort((a, b) => a.episode_number - b.episode_number);

    return (
        <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded(p => !p)}>
                <img
                    src={anime.poster || 'https://via.placeholder.com/60x80/141417/666?text=No+Img'}
                    style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    alt={anime.title}
                    referrerPolicy="no-referrer"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {anime.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                        {sortedEps.length} episode{sortedEps.length !== 1 ? 's' : ''}
                        {anime.category && <span style={{ marginLeft: '8px', padding: '2px 8px', background: 'rgba(229,9,20,0.15)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent)' }}>{anime.category}</span>}
                    </div>
                </div>
                <button style={btnDanger} onClick={e => { e.stopPropagation(); deleteAnime(); }} title="Delete anime">
                    <Trash2 size={15} />
                </button>
                {expanded ? <ChevronUp size={18} color="var(--text-dim)" /> : <ChevronDown size={18} color="var(--text-dim)" />}
            </div>

            {/* Expanded content */}
            {expanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Poster + Category */}
                    {/* Info Editing */}
                    {/* Info Editing */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Title & Description Section */}
                        <div style={{ ...card, background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Anime Title</label>
                                    <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Description</label>
                                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={desc} onChange={e => setDesc(e.target.value)} />
                                </div>
                            </div>
                            <button style={{ ...btnPrimary, width: 'fit-content', padding: '8px 16px' }} onClick={updateTitleInfo} disabled={saving}>
                                <Save size={15} /> Update Title & Info
                            </button>
                        </div>

                        {/* Poster & Category Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ ...card, background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Image size={13} /> Poster URL
                                </label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                    <input style={{ ...inputStyle, flex: 1 }} value={posterUrl} onChange={e => setPosterUrl(e.target.value)} />
                                    <button style={{ ...btnPrimary, padding: '8px' }} onClick={updatePoster} disabled={saving} title="Update Poster">
                                        <Save size={16} />
                                    </button>
                                </div>
                                {posterUrl && <img src={posterUrl} style={{ height: '80px', borderRadius: '4px', objectFit: 'cover' }} alt="preview" referrerPolicy="no-referrer" onError={e => e.target.style.display = 'none'} />}
                            </div>

                            <div style={{ ...card, background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Tag size={13} /> Category
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select style={{ ...inputStyle, flex: 1 }} value={category} onChange={e => setCategory(e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1a1a1e' }}>{c}</option>)}
                                    </select>
                                    <button style={{ ...btnPrimary, padding: '8px' }} onClick={updateCategory} disabled={saving} title="Update Category">
                                        <Save size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Episodes list */}
                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Episodes ({sortedEps.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                            {sortedEps.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '10px' }}>No episodes yet.</p>}
                            {sortedEps.map(ep => (
                                <div key={ep._id} style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '10px', 
                                    padding: '12px', 
                                    background: editingEp === ep._id ? 'rgba(229,9,20,0.08)' : 'rgba(255,255,255,0.04)', 
                                    borderRadius: '8px',
                                    border: editingEp === ep._id ? '1px solid var(--accent)' : '1px solid transparent'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'var(--accent)', fontWeight: '700', minWidth: '35px', fontSize: '1rem' }}>{ep.episode_number}</span>
                                        <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>{ep.title}</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                style={{ ...btnGhost, padding: '6px 12px', fontSize: '0.8rem', color: editingEp === ep._id ? 'var(--accent)' : 'inherit' }} 
                                                onClick={() => editingEp === ep._id ? cancelEditingEp() : startEditingEp(ep)}
                                            >
                                                {editingEp === ep._id ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Update</>}
                                            </button>
                                            <button style={{ ...btnDanger, padding: '6px 10px' }} onClick={() => deleteEpisode(ep._id, ep.title)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {editingEp === ep._id && (
                                        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px', marginBottom: '10px' }}>
                                                <input style={inputStyle} type="number" value={newEp.episode_number} onChange={e => setNewEp(p => ({ ...p, episode_number: e.target.value }))} />
                                                <input style={inputStyle} value={newEp.title} onChange={e => setNewEp(p => ({ ...p, title: e.target.value }))} />
                                            </div>
                                            <input style={{ ...inputStyle, marginBottom: '10px' }} placeholder="Media URL or File ID" value={newEp.media_url || newEp.file_id} onChange={e => setNewEp(p => ({ ...p, media_url: e.target.value, file_id: e.target.value }))} />
                                            <button style={{ ...btnPrimary, width: '100%' }} onClick={updateEpisode} disabled={saving}>
                                                <Save size={14} /> Save Changes & Log to Telegram
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Episode */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                        {!editingEp && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Add Episode
                                    </h4>
                                    <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                                        {['url', 'telegram'].map(t => (
                                            <button key={t} style={{ ...btnGhost, padding: '5px 12px', fontSize: '0.8rem', background: epType === t ? 'var(--accent)' : 'rgba(255,255,255,0.07)' }}
                                                onClick={() => setEpType(t)}>
                                                {t === 'url' ? '🌐 URL' : '✈️ Telegram'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Ep Number *</label>
                                        <input style={inputStyle} type="number" min="1" placeholder="1" value={newEp.episode_number} onChange={e => setNewEp(p => ({ ...p, episode_number: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Episode Title</label>
                                        <input style={inputStyle} placeholder={`${anime.title} Episode ${newEp.episode_number || '?'}`} value={newEp.title} onChange={e => setNewEp(p => ({ ...p, title: e.target.value }))} />
                                    </div>
                                </div>
                            </>
                        )}
                        {epType === 'url' ? (
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Media/Stream URL *</label>
                                <input style={inputStyle} placeholder="https://cdn.example.com/episode1.mp4" value={newEp.media_url} onChange={e => setNewEp(p => ({ ...p, media_url: e.target.value }))} />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Telegram file_id</label>
                                    <input style={inputStyle} placeholder="BQACAgIA..." value={newEp.file_id} onChange={e => setNewEp(p => ({ ...p, file_id: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Message ID</label>
                                    <input style={inputStyle} type="number" placeholder="123" value={newEp.message_id} onChange={e => setNewEp(p => ({ ...p, message_id: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Chat/Channel ID</label>
                                    <input style={inputStyle} placeholder="-1001234567" value={newEp.chat_id} onChange={e => setNewEp(p => ({ ...p, chat_id: e.target.value }))} />
                                </div>
                            </div>
                        )}
                        <button style={{ ...btnPrimary, marginTop: '12px' }} onClick={addEpisode} disabled={saving}>
                            <Plus size={15} /> {saving ? 'Adding...' : 'Add Episode'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnimeTab = ({ toast }) => {
    const [animes, setAnimes] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchAnimes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/anime?q=${encodeURIComponent(search)}`, authHeaders());
            setAnimes(res.data);
        } catch { toast('Failed to load anime list', 'error'); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchAnimes, 300);
        return () => clearTimeout(t);
    }, [fetchAnimes]);

    const handleDelete = (id) => setAnimes(p => p.filter(a => a._id !== id));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                        style={{ ...inputStyle, paddingLeft: '44px' }}
                        placeholder="Search anime title..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>Loading...</div>}
            {!loading && animes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-dim)' }}>No anime found</div>
            )}
            {animes.map(a => (
                <AnimeRow key={a._id} anime={a} toast={toast} onDelete={handleDelete} />
            ))}
        </div>
    );
};

// ─── Add Anime Tab ───────────────────────────────────────────────────────────
const AddAnimeTab = ({ toast }) => {
    const [form, setForm] = useState({ title: '', description: '', poster: '', category: 'Action' });
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!form.title.trim()) return toast('Title is required', 'error');
        setSaving(true);
        try {
            const res = await api.post('/api/admin/anime', form, authHeaders());
            toast(`"${res.data.title}" created! Slug: ${res.data.slug}`, 'success');
            setForm({ title: '', description: '', poster: '', category: 'Action' });
        } catch (e) {
            toast(e.response?.data?.error || 'Failed to create anime', 'error');
        } finally { setSaving(false); }
    };

    return (
        <div style={card}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={18} color="var(--accent)" /> Create New Anime Entry
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Anime Title *</label>
                    <input style={inputStyle} placeholder="e.g. Attack on Titan" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Poster Image URL</label>
                    <input style={inputStyle} placeholder="https://image.url/poster.jpg" value={form.poster} onChange={e => setForm(p => ({ ...p, poster: e.target.value }))} />
                </div>
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                        {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#1a1a1e' }}>{c}</option>)}
                    </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Description</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                        placeholder="Short description of the anime..."
                        value={form.description}
                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    />
                </div>
            </div>
            {form.poster && (
                <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', height: '150px', width: '100px' }}>
                    <img src={form.poster} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" onError={e => e.target.style.display = 'none'} referrerPolicy="no-referrer" />
                </div>
            )}
            <button style={{ ...btnPrimary, marginTop: '20px' }} onClick={handleCreate} disabled={saving}>
                <Plus size={16} /> {saving ? 'Creating...' : 'Create Anime Entry'}
            </button>
            <p style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                ℹ️ After creating, go to <strong>Manage Anime</strong> tab to add episodes.
            </p>
        </div>
    );
};

// ─── Main AdminPanel ─────────────────────────────────────────────────────────
const TABS = [
    { id: 'slider', label: 'Hero Slider', icon: <Image size={18} /> },
    { id: 'top5', label: 'Top 5', icon: <Trophy size={18} /> },
    { id: 'social', label: 'Socials', icon: <Send size={18} /> },
    { id: 'anime', label: 'Manage Anime', icon: <Film size={18} /> },
    { id: 'add', label: 'Add Anime', icon: <Plus size={18} /> },
];

const AdminPanel = () => {
    const [authed, setAuthed] = useState(!!getToken());
    const [tab, setTab] = useState('slider');
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleLogout = () => {
        clearToken();
        setAuthed(false);
    };

    if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Admin Navbar */}
            <div style={{
                background: 'rgba(14,14,17,0.95)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', height: '64px', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutDashboard size={22} color="var(--accent)" />
                        <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>MIZOFY <span style={{ color: 'var(--accent)' }}>Admin</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                    background: tab === t.id ? 'rgba(229,9,20,0.15)' : 'transparent',
                                    color: tab === t.id ? 'var(--accent)' : 'var(--text-dim)',
                                    fontWeight: tab === t.id ? '700' : '400',
                                    cursor: 'pointer', fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                    <button style={{ ...btnGhost, padding: '8px 14px', marginLeft: 'auto' }} onClick={handleLogout}>
                        <LogOut size={15} /> Logout
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>
                        {TABS.find(t => t.id === tab)?.label}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', marginTop: '4px', fontSize: '0.9rem' }}>
                        {tab === 'slider' && 'Manage up to 5 hero banner slides shown on the home page.'}
                        {tab === 'top5' && 'Manage your top listed anime recommendations.'}
                        {tab === 'social' && 'Update your Telegram, Instagram and other community links.'}
                        {tab === 'anime' && 'Search, edit, delete anime and their episodes. Update posters and categories.'}
                        {tab === 'add' && 'Create a new anime entry manually.'}
                    </p>
                </div>

                {tab === 'slider' && <SliderTab toast={showToast} />}
                {tab === 'top5' && <Top5Tab toast={showToast} />}
                {tab === 'social' && <SocialsTab toast={showToast} />}
                {tab === 'anime' && <AnimeTab toast={showToast} />}
                {tab === 'add' && <AddAnimeTab toast={showToast} />}
            </div>
        </div>
    );
};

export default AdminPanel;
