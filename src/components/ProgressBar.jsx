import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ProgressBar({ progress, label = 'Processing...' }) {
  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-header">
        <span className="progress-label flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          {label}
        </span>
        <span className="progress-percentage">{progress}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          <div className="progress-shimmer"></div>
        </div>
      </div>
    </div>
  );
}
