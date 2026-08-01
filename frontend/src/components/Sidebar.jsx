import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  History, X, Trash2, LogOut, LogIn,
  FileText, Type, Camera, Clock, RefreshCw, UserCircle2
} from 'lucide-react';
import {
  auth, signInWithGoogle, signInAsGuest, logoutUser,
  fetchUserHistory, deleteHistoryEntry, clearAllHistory
} from '../firebase';

const typeIcon = { pdf: FileText, image: Camera, text: Type };

function formatTs(ts) {
  if (!ts?.toDate) return '';
  const d = ts.toDate();
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function Sidebar({ isOpen, setIsOpen, onSelectHistoryEntry }) {
  const [user, setUser]             = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'text', 'pdf', 'image'
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await loadHistory(u.uid);
      } else {
        try { await signInAsGuest(); } catch (_) {}
      }
    });
    return () => unsub();
  }, []);

  // Animate list when opened
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const items = listRef.current.querySelectorAll('.h-item');
    if (!items.length) return;
    gsap.from(items, {
      opacity: 0, x: -14,
      duration: 0.32, stagger: 0.04, ease: 'power2.out', delay: 0.12,
    });
  }, [isOpen, history]);

  const loadHistory = async (uid) => {
    setLoading(true);
    const data = await fetchUserHistory(uid);
    setHistory(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    const data = await fetchUserHistory(user.uid);
    setHistory(data);
    setRefreshing(false);
  };

  const handleLogin  = async () => { try { await signInWithGoogle(); } catch (e) { console.error(e); } };
  const handleLogout = async () => { await logoutUser(); setHistory([]); };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!user) return;
    const el = e.currentTarget.closest('.h-item');
    if (el) {
      await gsap.to(el, {
        opacity: 0, x: -16, height: 0, marginBottom: 0, padding: 0,
        duration: 0.22, ease: 'power2.in',
      });
    }
    await deleteHistoryEntry(user.uid, id);
    setHistory(p => p.filter(h => h.id !== id));
  };

  const handleClearAll = async () => {
    if (!user || !history.length) return;
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    await clearAllHistory(user.uid);
    setHistory([]);
  };

  const isGoogle = user && !user.isAnonymous;
  const isAnon   = user?.isAnonymous;

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} aria-hidden />
      )}

      <aside className={`sidebar-panel ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--c-border-md)',
          background: '#fafbfd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#000000' }}>
            <History size={16} color="var(--c-primary)" />
            Conversion History
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-icon btn-icon-sm"
              onClick={handleRefresh}
              title="Refresh"
              disabled={refreshing}
            >
              <RefreshCw size={13} style={refreshing ? { animation: 'spin 0.75s linear infinite' } : {}} />
            </button>
            <button className="btn btn-icon btn-icon-sm" onClick={() => setIsOpen(false)} title="Close">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Auth card */}
        <div style={{
          padding: '11px 14px',
          borderBottom: '1px solid var(--c-border-md)',
          background: 'white',
          flexShrink: 0,
        }}>
          {isGoogle ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--c-border-md)', flexShrink: 0 }} />
                  : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--c-primary-soft)', color: 'var(--c-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13, border: '1px solid rgba(99,102,241,0.2)', flexShrink: 0,
                    }}>
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  )
                }
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || 'User'}
                  </p>
                  <p style={{ fontSize: 11, color: '#444444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-icon btn-icon-sm"
                onClick={handleLogout}
                title="Sign out"
                style={{ color: 'var(--c-danger)', flexShrink: 0 }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <UserCircle2 size={18} color="#64748b" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#000000' }}>
                  {isAnon ? 'Guest Mode' : 'Not signed in'}
                </span>
              </div>
              <button
                className="btn btn-primary btn-xs"
                onClick={handleLogin}
                id="google-signin-btn"
                style={{ flexShrink: 0 }}
              >
                <LogIn size={11} />Sign in
              </button>
            </div>
          )}
        </div>

        {/* Category Filter Columns */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--c-border-md)',
          background: '#f1f3f7',
          padding: '2px',
          margin: '8px 12px 4px',
          borderRadius: 8,
          flexShrink: 0
        }}>
          {['all', 'text', 'pdf', 'image'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                flex: 1,
                padding: '6px 2px',
                border: 'none',
                background: filterType === t ? 'white' : 'transparent',
                color: filterType === t ? 'black' : '#64748b',
                fontWeight: 700,
                fontSize: 10,
                borderRadius: 6,
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
                boxShadow: filterType === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* History list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            </div>
          ) : (() => {
            const filtered = history.filter(item => filterType === 'all' || item.inputType === filterType);
            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <Clock size={34} style={{ margin: '0 auto 12px', color: '#94a3b8', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 5 }}>
                    No conversions found
                  </p>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                    {filterType === 'all' 
                      ? 'Your transliterations will appear here automatically'
                      : `No ${filterType} entries in your history`
                    }
                  </p>
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {filtered.map((item) => {
                  const Icon = typeIcon[item.inputType] || Type;
                  return (
                    <div
                      key={item.id}
                      className="history-item h-item"
                      onClick={() => onSelectHistoryEntry(item)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: 'var(--c-primary-soft)',
                          border: '1px solid rgba(99,102,241,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 1,
                        }}>
                          <Icon size={12} color="var(--c-primary)" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="font-kannada" style={{
                            fontSize: 13, fontWeight: 700, color: '#000000', // Made bold and pure black for maximum visibility
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.originalText?.slice(0, 40) || item.fileName || 'Untitled'}
                          </p>
                          {item.transliteratedText && (
                            <p className="font-devanagari" style={{
                              fontSize: 11, color: '#333333', marginTop: 2, // Darker contrast gray for transliterated text
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {item.transliteratedText.slice(0, 45)}
                            </p>
                          )}
                          {item.timestamp && (
                            <p style={{ fontSize: 10, color: '#555555', marginTop: 3 }}> // Readable dark text for timestamp
                              {formatTs(item.timestamp)}
                            </p>
                          )}
                        </div>

                        <button
                          className="del-btn"
                          onClick={e => handleDelete(e, item.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', padding: '3px', borderRadius: 5,
                            opacity: 0, transition: 'opacity 0.15s', flexShrink: 0,
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--c-border-md)',
            background: '#fafbfd',
            flexShrink: 0,
          }}>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleClearAll}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Trash2 size={12} />Clear All History
            </button>
          </div>
        )}
      </aside>

      <style>{`.h-item:hover .del-btn { opacity: 1 !important; }`}</style>
    </>
  );
}
