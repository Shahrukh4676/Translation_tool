import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Type, FileText, Camera } from 'lucide-react';

const TABS = [
  { id: 'text',  labelFull: 'Text Mode',      labelShort: 'Text',  Icon: Type },
  { id: 'pdf',   labelFull: 'PDF Document',    labelShort: 'PDF',   Icon: FileText },
  { id: 'image', labelFull: 'Image & Camera',  labelShort: 'Image', Icon: Camera },
];

export default function TabNavigation({ activeTab, setActiveTab }) {
  const barRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.tab-btn', {
        opacity: 0, x: -10,
        duration: 0.38, stagger: 0.07, ease: 'power2.out', delay: 0.15,
      });
    }, barRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="tabs-bar" ref={barRef}>
      <div className="tabs-scroll">
        {TABS.map(({ id, labelFull, labelShort, Icon }) => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            id={`tab-${id}`}
          >
            <Icon className="tab-icon" size={15} />
            <span className="tab-label-full">{labelFull}</span>
            <span className="tab-label-short">{labelShort}</span>
            <span className="tab-underline" />
          </button>
        ))}
      </div>
    </div>
  );
}
