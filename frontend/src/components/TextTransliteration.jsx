import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import {
  Copy, Download, Trash2, Check,
  Clock, ShieldCheck, ArrowRight, RotateCw
} from 'lucide-react';
import { auth, saveToHistory } from '../firebase';

export default function TextTransliteration({ selectedHistory }) {
  const [inputText, setInputText]   = useState('');
  const [outputText, setOutputText] = useState('');
  const [stats, setStats]           = useState(null);
  const [execMs, setExecMs]         = useState(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [error, setError]           = useState(null);
  const containerRef = useRef(null);
  const outputPaneRef = useRef(null);
  const timerRef = useRef(null);

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.tt-pane-left, .tt-pane-right', {
        opacity: 0, y: 20,
        duration: 0.5, stagger: 0.1, ease: 'power2.out',
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Load from history
  useEffect(() => {
    if (!selectedHistory) return;
    if (selectedHistory.originalText)     setInputText(selectedHistory.originalText);
    if (selectedHistory.transliteratedText) setOutputText(selectedHistory.transliteratedText);
  }, [selectedHistory]);

  // Debounced auto-transliterate
  useEffect(() => {
    if (!inputText.trim()) {
      setOutputText(''); setStats(null); setExecMs(null); setError(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doTransliterate(inputText), 480);
    return () => clearTimeout(timerRef.current);
  }, [inputText]);

  const doTransliterate = useCallback(async (text) => {
    if (!text.trim()) return;
    setIsLoading(true); setError(null);
    try {
      const res = await fetch('/api/transliterate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setOutputText(data.result);
      setStats(data.statistics);
      setExecMs(data.execution_time_ms);

      // Flash output pane
      if (outputPaneRef.current) {
        gsap.fromTo(outputPaneRef.current,
          { opacity: 0.5 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
      }

      // Save to Firebase
      if (auth.currentUser) {
        saveToHistory(auth.currentUser.uid, {
          inputType: 'text',
          originalText: text,
          transliteratedText: data.result,
        });
      }
    } catch {
      setError('Cannot reach the transliteration engine. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `akshara_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setInputText(''); setOutputText('');
    setStats(null); setExecMs(null); setError(null);
  };

  const wc = (t) => t.trim() ? t.trim().split(/\s+/).length : 0;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Split panes ── */}
      <div className="split-grid">

        {/* Input pane */}
        <div className="card tt-pane-left" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16,185,129,0.2)',
                flexShrink: 0,
              }} />
              <span className="panel-label">Kannada Input · ಕನ್ನಡ</span>
            </div>
            {inputText && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={handleClear}
                style={{ color: 'var(--c-danger)', padding: '4px 8px' }}
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              id="kannada-input"
              className="textarea-bare font-kannada pane-textarea"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="ಇಲ್ಲಿ ಕನ್ನಡ ಪಠ್ಯ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಪೇಸ್ಟ್ ಮಾಡಿ…"
              style={{ flex: 1, lineHeight: 1.75 }}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
            />
          </div>

          {/* Input footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--c-border)',
            background: '#fafbfd',
            borderRadius: '0 0 var(--r-lg) var(--r-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="stat-chip">{inputText.length} chars</span>
              <span className="stat-chip">{wc(inputText)} words</span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => doTransliterate(inputText)}
              disabled={!inputText.trim() || isLoading}
              id="convert-btn"
            >
              {isLoading
                ? <><div className="spinner spinner-sm" />Converting…</>
                : <><span>Convert</span><ArrowRight size={13} /></>
              }
            </button>
          </div>
        </div>

        {/* Output pane */}
        <div ref={outputPaneRef} className="card tt-pane-right" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--c-primary)',
                boxShadow: '0 0 0 2px rgba(99,102,241,0.2)',
                flexShrink: 0,
              }} />
              <span className="panel-label">Devanagari Output · देवनागरी</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-xs"
                onClick={handleCopy}
                disabled={!outputText}
              >
                {copied
                  ? <><Check size={12} style={{ color: '#10b981' }} />Copied!</>
                  : <><Copy size={12} />Copy</>
                }
              </button>
              <button
                className="btn btn-secondary btn-xs"
                onClick={handleDownload}
                disabled={!outputText}
              >
                <Download size={12} />
                <span>Save</span>
              </button>
            </div>
          </div>

          <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Loading overlay */}
            {isLoading && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0 0 var(--r-lg) var(--r-lg)',
                zIndex: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>
                  <RotateCw size={15} style={{ animation: 'spin 0.75s linear infinite' }} />
                  Transliterating…
                </div>
              </div>
            )}

            <textarea
              id="devanagari-output"
              className="textarea-bare font-devanagari pane-textarea"
              value={outputText}
              readOnly
              placeholder="देवनागरी रूपान्तरण यहाँ दिखाई देगा…"
              style={{ flex: 1, lineHeight: 1.75, cursor: 'default' }}
            />

            {/* Override chips */}
            {stats?.overrides_applied?.length > 0 && (
              <div className="alert alert-info" style={{ marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
                <ShieldCheck size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>Overrides applied:</span>
                {stats.overrides_applied.map((ov, i) => (
                  <span key={i} className="badge badge-indigo">
                    <span className="font-kannada">{ov.kannada}</span>
                    &nbsp;→&nbsp;
                    <span className="font-devanagari">{ov.devanagari}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Output footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--c-border)',
            background: '#fafbfd',
            borderRadius: '0 0 var(--r-lg) var(--r-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="stat-chip">{outputText.length} chars</span>
              <span className="stat-chip">{wc(outputText)} words</span>
            </div>
            {execMs !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} color="var(--c-text-3)" />
                <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 500 }}>{execMs} ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error anim-slide-up">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
