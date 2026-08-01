import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { History, LogIn, LogOut } from 'lucide-react';
import { auth, logoutUser } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Header({ onToggleSidebar, isSidebarOpen, onOpenAuth }) {
  const [user, setUser] = React.useState(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.header-anim', {
        opacity: 0, y: -8, duration: 0.42, stagger: 0.07, ease: 'power2.out',
      });
    }, headerRef);
    return () => ctx.revert();
  }, []);

  const emailInitial = user?.email?.[0]?.toUpperCase()
    || user?.displayName?.[0]?.toUpperCase()
    || null;
  const isGoogle = user && !user.isAnonymous;

  return (
    <header className="site-header" ref={headerRef}>
      <div className="header-inner">

        {/* Left: history toggle + logo */}
        <div className="header-anim" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-icon"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Close history' : 'View history'}
            style={isSidebarOpen ? {
              background: 'var(--c-primary-soft)',
              borderColor: 'rgba(99,102,241,0.3)',
              color: 'var(--c-primary)',
            } : {}}
          >
            <History size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-orb" aria-hidden>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="font-kannada" style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1 }}>ಅ</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>→</span>
                <span className="font-devanagari" style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1 }}>अ</span>
              </div>
            </div>
            <div className="header-logo-text">
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>
                Akshara
              </span>
              <p style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 500, marginTop: 1 }}>
                Kannada → Devanagari
              </p>
            </div>
          </div>
        </div>

        {/* Right: auth */}
        <div className="header-anim" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isGoogle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Avatar with email initial */}
              <div
                title={user.email}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  border: '2px solid rgba(99,102,241,0.2)',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                  cursor: 'default',
                  flexShrink: 0,
                }}
              >
                {emailInitial}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => logoutUser()}
                title="Sign out"
                style={{ color: 'var(--c-text-2)', padding: '6px 10px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenAuth}
              id="header-signin-btn"
            >
              <LogIn size={13} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
