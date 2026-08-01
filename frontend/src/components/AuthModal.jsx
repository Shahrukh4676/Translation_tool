import React, { useState, useEffect } from 'react';
import { X, LogIn } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

export default function AuthModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Google Sign-In failed or popup was closed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 400 }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--c-border-md)',
          background: '#fafbfd',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: 'var(--c-text)' }}>
            <LogIn size={18} color="var(--c-primary)" />
            Sign In to Akshara
          </div>
          <button className="btn btn-icon btn-icon-sm" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
          <div>
            <div className="logo-orb" style={{ margin: '0 auto 12px', width: 44, height: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="font-kannada" style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>ಅ</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>→</span>
                <span className="font-devanagari" style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>अ</span>
              </div>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4 }}>
              Sync Your History Across Devices
            </h3>
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
              Sign in with your Google account to save your Kannada &amp; Devanagari transliteration history securely in the cloud.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12, padding: '10px 12px', textAlign: 'left' }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-secondary"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              justify: 'center',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid var(--c-border-strong)',
              boxShadow: 'var(--shadow-xs)',
              gap: 10,
            }}
          >
            {/* Google G icon SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {loading ? 'Signing in with Google…' : 'Continue with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}
