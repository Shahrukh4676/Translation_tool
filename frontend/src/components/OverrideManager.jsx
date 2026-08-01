import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldCheck, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function OverrideManager({ onClose }) {
  const [overrides, setOverrides]   = useState([]);
  const [kannada, setKannada]       = useState('');
  const [devanagari, setDevanagari] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(null);

  useEffect(() => {
    fetchOverrides();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const fetchOverrides = async () => {
    try {
      const res  = await fetch('/api/overrides/');
      const data = await res.json();
      setOverrides(data.overrides || []);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!kannada.trim() || !devanagari.trim()) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/overrides/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kannada: kannada.trim(), devanagari: devanagari.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save rule.');
      setKannada(''); setDevanagari('');
      setSuccess('Override rule saved!');
      setTimeout(() => setSuccess(null), 3000);
      await fetchOverrides();
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'Cannot connect to backend server. Please ensure the backend server is running on http://127.0.0.1:8000.'
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key) => {
    try {
      await fetch(`/api/overrides/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setOverrides(p => p.filter(o => o.kannada !== key));
    } catch (e) { console.error(e); }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--c-border-md)',
          background: '#fafbfd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: 'var(--c-primary-soft)',
              border: '1px solid rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShieldCheck size={18} color="var(--c-primary)" />
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-text)' }}>
                Proper Noun Overrides
              </h2>
              <p style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>
                Force specific spellings for Kannada words
              </p>
            </div>
          </div>
          <button className="btn btn-icon btn-icon-sm" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Info */}
          <div className="alert alert-info" style={{ fontSize: 12, lineHeight: 1.55 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Override rules run <strong>before</strong> the main engine — using a <strong>longest-match-first</strong> strategy.
              Perfect for place names and proper nouns where automatic transliteration is inaccurate.
            </span>
          </div>

          {/* Add form */}
          <form
            onSubmit={handleAdd}
            style={{
              background: '#fafbfd',
              border: '1px solid var(--c-border-md)',
              borderRadius: 13, padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
              Add New Rule
            </p>

            <div className="override-form-grid">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', display: 'block', marginBottom: 6 }}>
                  Kannada Word / Phrase
                </label>
                <input
                  className="input-field font-kannada"
                  type="text"
                  value={kannada}
                  onChange={e => setKannada(e.target.value)}
                  placeholder="ಬೆಂಗಳೂರು"
                  style={{ fontFamily: 'Noto Sans Kannada, sans-serif', fontSize: 15 }}
                  id="override-kannada-input"
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', display: 'block', marginBottom: 6 }}>
                  Devanagari Spelling
                </label>
                <input
                  className="input-field font-devanagari"
                  type="text"
                  value={devanagari}
                  onChange={e => setDevanagari(e.target.value)}
                  placeholder="बेंगलूरु"
                  style={{ fontFamily: 'Noto Sans Devanagari, sans-serif', fontSize: 15 }}
                  id="override-devanagari-input"
                  autoComplete="off"
                />
              </div>
            </div>

            {error   && <div className="alert alert-error"   style={{ fontSize: 12, padding: '9px 12px' }}><AlertCircle size={13} style={{ flexShrink: 0 }} />{error}</div>}
            {success && <div className="alert alert-success" style={{ fontSize: 12, padding: '9px 12px' }}><CheckCircle2 size={13} style={{ flexShrink: 0 }} />{success}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !kannada.trim() || !devanagari.trim()}
              style={{ width: '100%', justifyContent: 'center' }}
              id="add-override-btn"
            >
              <Plus size={14} />
              {loading ? 'Saving…' : 'Add Override Rule'}
            </button>
          </form>

          {/* Rules list */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)' }}>
                Active Rules
              </p>
              <span className="badge badge-slate">{overrides.length} rule{overrides.length !== 1 ? 's' : ''}</span>
            </div>

            {overrides.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '28px 16px',
                background: '#fafbfd', border: '1px dashed var(--c-border-strong)',
                borderRadius: 10,
              }}>
                <ShieldCheck size={26} style={{ margin: '0 auto 8px', color: 'var(--c-text-3)', opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: 'var(--c-text-3)' }}>No override rules added yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overrides.map((item, i) => (
                  <div key={i} className="override-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span className="font-kannada" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>
                        {item.kannada}
                      </span>
                      <span style={{ color: 'var(--c-text-3)', fontSize: 12, flexShrink: 0 }}>→</span>
                      <span className="font-devanagari" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary)' }}>
                        {item.devanagari}
                      </span>
                    </div>
                    <button
                      className="btn btn-icon btn-icon-sm"
                      onClick={() => handleDelete(item.kannada)}
                      style={{
                        color: 'var(--c-danger)',
                        border: '1px solid rgba(239,68,68,0.18)',
                        background: 'rgba(239,68,68,0.04)',
                        flexShrink: 0,
                      }}
                      title="Delete rule"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
