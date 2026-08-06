import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export default function PrivacyBadge({ compact = false }) {
  if (compact) {
    return (
      <div className="privacy-badge-compact">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>100% Client-Side Private</span>
      </div>
    );
  }

  return (
    <div className="privacy-badge-hero">
      <ShieldCheck className="w-4 h-4 text-emerald-600" />
      <span className="privacy-text font-medium">
        <strong>100% Private</strong> &mdash; Processed in your Browser (No files uploaded to any server)
      </span>
      <div className="privacy-tag">
        <Lock className="w-3 h-3 text-emerald-700 inline mr-1" /> Browser Only
      </div>
    </div>
  );
}
