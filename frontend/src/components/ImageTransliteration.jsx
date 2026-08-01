import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  Camera, Image as ImageIcon, AlertCircle,
  Loader2, ArrowRight, Copy, Check, Download, ScanLine
} from 'lucide-react';

export default function ImageTransliteration() {
  const [imageFile, setImageFile]         = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [outputText, setOutputText]       = useState('');
  const [isOcr, setIsOcr]                 = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDragOver, setIsDragOver]       = useState(false);
  const [copied, setCopied]               = useState(false);
  const [error, setError]                 = useState(null);
  const containerRef = useRef(null);
  const panelsRef    = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.img-zone', { opacity: 0, y: 16, duration: 0.45, ease: 'power2.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSelect = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image (JPEG, PNG, WEBP, BMP, TIFF).'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large — maximum 10 MB.'); return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExtractedText(''); setOutputText(''); setError(null);
    await runOcr(file);
  };

  const runOcr = async (f) => {
    setIsOcr(true); setError(null);
    const form = new FormData();
    form.append('file', f);
    try {
      const res = await fetch('/api/transliterate/image', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `OCR failed (${res.status})`);
      }
      const data = await res.json();
      setExtractedText(data.extractedText);

      // Animate panels in
      if (panelsRef.current) {
        gsap.from(panelsRef.current.children, {
          opacity: 0, y: 16,
          duration: 0.42, stagger: 0.1, ease: 'power2.out',
        });
      }
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'Cannot connect to backend server. Please ensure the backend server is running on http://127.0.0.1:8000.'
        : err.message;
      setError(msg);
    } finally {
      setIsOcr(false);
    }
  };

  const handleTransliterate = async () => {
    if (!extractedText.trim()) return;
    setIsTranslating(true); setError(null);
    try {
      const res = await fetch('/api/transliterate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText }),
      });
      if (!res.ok) throw new Error('Transliteration failed');
      const data = await res.json();
      setOutputText(data.result);
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'Cannot connect to backend server. Please ensure the backend server is running on http://127.0.0.1:8000.'
        : err.message;
      setError(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `akshara_ocr_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleSelect(e.dataTransfer.files[0]);
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Upload zone */}
      <div
        className={`card img-zone drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-zone-inner" style={{
          textAlign: 'center', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 62, height: 62, borderRadius: 18,
            background: 'var(--c-primary-soft)',
            border: '1px solid rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={28} color="var(--c-primary)" />
          </div>

          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--c-text)', marginBottom: 5 }}>
              Kannada Image OCR
            </h3>
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
              Upload a photo or scan — OCR extracts Kannada text for review before converting
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <ImageIcon size={13} />
              <span>Select Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleSelect(e.target.files[0])}
                style={{ display: 'none' }}
                id="image-file-input"
              />
            </label>
            <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
              <Camera size={13} />
              <span>Take Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => handleSelect(e.target.files[0])}
                style={{ display: 'none' }}
                id="camera-input"
              />
            </label>
          </div>

          {imageFile && !isOcr && (
            <p style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600, marginTop: -4 }}>
              ✓ {imageFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error anim-slide-up">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Review + output panels */}
      {(previewUrl || isOcr) && (
        <div ref={panelsRef} className="img-panels-grid">

          {/* Left: Preview + editable extracted text */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--c-warn)',
                  boxShadow: '0 0 0 2px rgba(245,158,11,0.2)',
                }} />
                <span className="panel-label">Step 1 — Review OCR Text</span>
              </div>
              <span className="badge badge-amber">
                <ScanLine size={10} />
                Mandatory Review
              </span>
            </div>

            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Image thumbnail */}
              {previewUrl && (
                <div style={{
                  height: 160, borderRadius: 10,
                  overflow: 'hidden', background: '#f1f5f9',
                  border: '1px solid var(--c-border-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <img
                    src={previewUrl}
                    alt="OCR source"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

              {/* Char count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)' }}>
                  Extracted Kannada Text
                  <span style={{ color: 'var(--c-text-3)', fontWeight: 400 }}> (edit if OCR made mistakes)</span>
                </label>
                <span className="stat-chip">{extractedText.length} chars</span>
              </div>

              {isOcr ? (
                <div style={{
                  flex: 1, minHeight: 130, background: '#f8fafc',
                  borderRadius: 10, border: '1px solid var(--c-border-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, fontSize: 13, color: 'var(--c-text-2)', fontWeight: 500,
                }}>
                  <Loader2 size={16} style={{ animation: 'spin 0.75s linear infinite', color: 'var(--c-primary)' }} />
                  Running Tesseract OCR…
                </div>
              ) : (
                <textarea
                  className="input-field font-kannada"
                  value={extractedText}
                  onChange={e => setExtractedText(e.target.value)}
                  placeholder="OCR result appears here. Edit any mistakes before converting…"
                  style={{
                    flex: 1, minHeight: 130, resize: 'vertical',
                    fontFamily: 'Noto Sans Kannada, sans-serif',
                    fontSize: 15, lineHeight: 1.7,
                  }}
                  id="ocr-text-edit"
                />
              )}

              <button
                className="btn btn-primary"
                onClick={handleTransliterate}
                disabled={isOcr || !extractedText.trim() || isTranslating}
                id="confirm-transliterate-btn"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isTranslating
                  ? <><Loader2 size={15} style={{ animation: 'spin 0.75s linear infinite' }} />Converting…</>
                  : <><span>Confirm &amp; Convert to Devanagari</span><ArrowRight size={14} /></>
                }
              </button>
            </div>
          </div>

          {/* Right: Devanagari output */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--c-primary)',
                  boxShadow: '0 0 0 2px rgba(99,102,241,0.2)',
                }} />
                <span className="panel-label">Step 2 — Devanagari Output</span>
              </div>
              {outputText && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-xs" onClick={handleCopy}>
                    {copied
                      ? <><Check size={11} style={{ color: '#10b981' }} />Copied!</>
                      : <><Copy size={11} />Copy</>
                    }
                  </button>
                  <button className="btn btn-secondary btn-xs" onClick={handleDownload}>
                    <Download size={11} />Save
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 16px', flex: 1 }}>
              <textarea
                className="input-field font-devanagari"
                value={outputText}
                readOnly
                placeholder="देवनागरी रूपान्तरण यहाँ दिखाई देगा…"
                style={{
                  width: '100%', minHeight: 300, resize: 'none',
                  fontFamily: 'Noto Sans Devanagari, sans-serif',
                  fontSize: 16, lineHeight: 1.8, cursor: 'default',
                  background: outputText ? 'white' : '#fafbfd',
                }}
                id="image-output-devanagari"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
