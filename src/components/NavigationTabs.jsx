import React from 'react';
import { Layers, Scissors, Minimize2, ImagePlus, FileImage } from 'lucide-react';

export const TABS = [
  { id: 'merge', label: 'Merge PDF', icon: Layers, desc: 'Combine multiple PDFs' },
  { id: 'split', label: 'Split & Extract', icon: Scissors, desc: 'Extract pages to new PDF' },
  { id: 'compress', label: 'Compress Image', icon: Minimize2, desc: 'Reduce JPG, PNG, WebP size' },
  { id: 'img2pdf', label: 'Image to PDF', icon: ImagePlus, desc: 'Convert photos to PDF' },
  { id: 'pdf2img', label: 'PDF to Image', icon: FileImage, desc: 'Export PDF pages as images' },
];

export default function NavigationTabs({ activeTab, setActiveTab }) {
  return (
    <nav className="nav-tabs-wrapper">
      <div className="nav-tabs-list">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab-button ${isActive ? 'active' : ''}`}
            >
              <div className="nav-tab-icon">
                <Icon className="w-5 h-5" />
              </div>
              <div className="nav-tab-text">
                <span className="nav-tab-title">{tab.label}</span>
                <span className="nav-tab-desc">{tab.desc}</span>
              </div>
              {isActive && <div className="active-tab-glow" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
