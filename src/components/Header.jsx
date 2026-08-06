import React from 'react';
import { Layers, Sparkles } from 'lucide-react';
import PrivacyBadge from './PrivacyBadge';

export default function Header() {
  return (
    <header className="header-container">
      <div className="header-content">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="logo-brand flex items-center gap-2">
              <h1 className="logo-title">merge<span className="logo-accent">all</span></h1>
            </div>
            <p className="logo-tagline">Client-Side PDF & Image Utilities</p>
          </div>
        </div>
      </div>
    </header>
  );
}
