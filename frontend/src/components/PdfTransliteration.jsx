import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import {
  FileText, Download, ChevronDown, ChevronUp,
  AlertCircle, FileCheck, Loader2, Upload, Info
} from 'lucide-react';

export default function PdfTransliteration() {
  const [file, setFile]             = useState(null);
  const [pages, setPages]           = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [progress, setProgress]           = useState(0);
  const [processedPages, setProcessedPages] = useState(0);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  // Check backend health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.pdf-zone', {
        opacity: 0, scale: 0.97, y: 12,
        duration: 0.45, ease: 'power2.out',
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      setError('Please select a valid PDF file (.pdf).'); return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError('File too large — maximum 25 MB.'); return;
    }
    setFile(f); setError(null); setPages([]);
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const process = async () => {
    if (!file) return;
    setIsProcessing(true); setError(null); setPages([]); setProgress(0); setProcessedPages(0);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/transliterate/pdf/async', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const { job_id } = await res.json();
      
      // Polling function
      const poll = () => {
        setTimeout(async () => {
          try {
            const statusRes = await fetch(`/api/transliterate/pdf/job/${job_id}`);
            if (!statusRes.ok) throw new Error('Failed to fetch job status');
            const jobData = await statusRes.json();
            
            setProgress(jobData.progress || 0);
            setProcessedPages(jobData.processed_pages || 0);
            
            // Progressively render pages as they get processed on the backend
            if (jobData.results && jobData.results.length > 0) {
              setPages(jobData.results);
            }

            if (jobData.status === 'completed') {
              setPages(jobData.results || []);
              setIsProcessing(false);
              setExpanded({ 1: true });
              setTimeout(() => {
                gsap.from('.pdf-card', {
                  opacity: 0, y: 16,
                  duration: 0.4, stagger: 0.055, ease: 'power2.out', delay: 0.1,
                });
              }, 50);
            } else if (jobData.status === 'failed') {
              throw new Error(jobData.error || 'PDF processing failed on server');
            } else {
              poll(); // continue polling
            }
          } catch (pollErr) {
            setError(pollErr.message);
            setIsProcessing(false);
          }
        }, 1000);
      };
      
      poll();
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'Cannot connect to backend server. Please ensure the backend server is running on http://127.0.0.1:8000.'
        : err.message;
      setError(msg);
      setIsProcessing(false);
    }
  };

  const togglePage = (n) => setExpanded(p => ({ ...p, [n]: !p[n] }));

  const downloadTxt = () => {
    const full = pages
      .map(p => `=== PAGE ${p.page} ===\n\nKANNADA ORIGINAL:\n${p.original}\n\nDEVANAGARI TRANSLITERATED:\n${p.transliterated}\n`)
      .join('\n');
    const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `akshara_pdf_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    try {
      const res = await fetch('/api/transliterate/pdf/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pages),
      });
      if (!res.ok) throw new Error('DOCX export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `akshara_${Date.now()}.docx`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download .docx file.');
    }
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Upload zone */}
      <div
        className={`card pdf-zone drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-zone-inner" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* Icon */}
          <div style={{
            width: 62, height: 62, borderRadius: 18,
            background: file ? 'rgba(16,185,129,0.08)' : 'var(--c-primary-soft)',
            border: `1px solid ${file ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}>
            {file
              ? <FileCheck size={28} color="#10b981" />
              : <FileText size={28} color="var(--c-primary)" />
            }
          </div>

          {/* Text */}
          {file ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-text)', marginBottom: 3 }}>
                {file.name}
              </p>
              {isProcessing ? (
                <div style={{ marginTop: 8, width: 220 }}>
                  <p style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600, marginBottom: 5 }}>
                    Processing page {processedPages} ({progress}%)
                  </p>
                  <div style={{ width: '100%', height: 6, background: 'rgba(99,102,241,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--c-primary)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · PDF ready to process
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--c-text)', marginBottom: 5 }}>
                Upload a Kannada PDF
              </h3>
              <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                Drag & drop, or tap to browse
                <span style={{ display: 'block', fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>
                  Max 25 MB · up to 200 pages
                </span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload size={13} />
              {file ? 'Change File' : 'Browse File'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => handleFile(e.target.files[0])}
              style={{ display: 'none' }}
              id="pdf-file-input"
            />

            {file && (
              <button
                className="btn btn-primary btn-sm"
                onClick={process}
                disabled={isProcessing}
                id="process-pdf-btn"
              >
                {isProcessing
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.75s linear infinite' }} />Processing {progress}%…</>
                  : <><FileCheck size={13} />Transliterate PDF</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error anim-slide-up">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {pages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Results header */}
          <div className="card" style={{
            padding: '14px 16px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-text)', marginBottom: 2 }}>
                Transliteration Complete
              </h3>
              <p style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
                {pages.length} page{pages.length > 1 ? 's' : ''} processed successfully
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={downloadTxt}>
                <Download size={13} />Download .txt
              </button>
              <button className="btn btn-primary btn-sm" onClick={downloadDocx}>
                <Download size={13} />Download .docx
              </button>
            </div>
          </div>

          {/* Page accordion */}
          {pages.map(p => (
            <div key={p.page} className="card pdf-card" style={{ overflow: 'hidden' }}>
              <button
                onClick={() => togglePage(p.page)}
                style={{
                  width: '100%', padding: '13px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fafbfd', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: expanded[p.page] ? '1px solid var(--c-border-md)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'var(--c-primary-soft)',
                    color: 'var(--c-primary)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    fontWeight: 700, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{p.page}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>
                    Page {p.page}
                  </span>
                  {p.is_scanned && <span className="badge badge-amber">Scanned OCR</span>}
                </div>
                {expanded[p.page]
                  ? <ChevronUp size={17} color="var(--c-text-3)" />
                  : <ChevronDown size={17} color="var(--c-text-3)" />
                }
              </button>

              {expanded[p.page] && (
                <div className="pdf-page-grid" style={{ background: '#fcfcfd' }}>
                  <div>
                    <p className="panel-label" style={{ marginBottom: 8 }}>Original Kannada</p>
                    <div className="font-kannada" style={{
                      background: 'white', border: '1px solid var(--c-border-md)',
                      borderRadius: 10, padding: '12px 14px',
                      fontSize: 14, lineHeight: 1.75,
                      maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap',
                    }}>
                      {p.original || <span style={{ color: 'var(--c-text-3)', fontStyle: 'italic' }}>No text extracted</span>}
                    </div>
                  </div>
                  <div>
                    <p className="panel-label" style={{ marginBottom: 8, color: 'var(--c-primary)' }}>
                      Transliterated Devanagari
                    </p>
                    <div className="font-devanagari" style={{
                      background: 'white', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 10, padding: '12px 14px',
                      fontSize: 14, lineHeight: 1.75,
                      maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap',
                    }}>
                      {p.transliterated || <span style={{ color: 'var(--c-text-3)', fontStyle: 'italic' }}>No output</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
