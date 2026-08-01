import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import TextTransliteration from './components/TextTransliteration';
import PdfTransliteration from './components/PdfTransliteration';
import ImageTransliteration from './components/ImageTransliteration';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('text');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const contentRef = useRef(null);

  // Page entrance animation
  useEffect(() => {
    if (!contentRef.current) return;
    gsap.from(contentRef.current, {
      opacity: 0, y: 18, duration: 0.55, ease: 'power3.out', delay: 0.08,
    });
  }, []);

  // Tab switch animation
  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }
    );
  }, [activeTab]);

  const handleSelectHistory = (entry) => {
    setSelectedHistory(entry);
    if (entry.inputType) setActiveTab(entry.inputType);
    setIsSidebarOpen(false);
  };

  return (
    <>
      <div className="bg-orb bg-orb-1" aria-hidden />
      <div className="bg-orb bg-orb-2" aria-hidden />

      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Header
          onToggleSidebar={() => setIsSidebarOpen(p => !p)}
          isSidebarOpen={isSidebarOpen}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <main ref={contentRef} className="page-container" style={{ flex: 1 }}>
          <div style={{ display: activeTab === 'text' ? 'block' : 'none' }}>
            <TextTransliteration selectedHistory={selectedHistory} />
          </div>
          <div style={{ display: activeTab === 'pdf' ? 'block' : 'none' }}>
            <PdfTransliteration />
          </div>
          <div style={{ display: activeTab === 'image' ? 'block' : 'none' }}>
            <ImageTransliteration />
          </div>
        </main>

        <footer className="site-footer">
          Akshara Engine &nbsp;·&nbsp; Kannada → Devanagari Script Transliteration
        </footer>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onSelectHistoryEntry={handleSelectHistory}
      />

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}
    </>
  );
}
