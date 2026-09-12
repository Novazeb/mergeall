import React, { useState } from 'react';
import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';
import { ToastProvider } from './context/ToastContext';

import MergePdfTool from './tools/MergePdfTool';
import SplitPdfTool from './tools/SplitPdfTool';
import CompressImageTool from './tools/CompressImageTool';
import ImageToPdfTool from './tools/ImageToPdfTool';
import PdfToImageTool from './tools/PdfToImageTool';
import OrganizePdfTool from './tools/OrganizePdfTool';
import CompressPdfTool from './tools/CompressPdfTool';
import ProtectPdfTool from './tools/ProtectPdfTool';
import ScanDocumentTool from './tools/ScanDocumentTool';

export default function App() {
  const [activeTab, setActiveTab] = useState('merge');

  return (
    <ToastProvider>
      <div className="app-layout">
        <Header />

        <main className="main-content">
          <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="tool-view-container">
            {activeTab === 'merge' && <MergePdfTool />}
            {activeTab === 'split' && <SplitPdfTool />}
            {activeTab === 'organize' && <OrganizePdfTool />}
            {activeTab === 'scan' && <ScanDocumentTool />}
            {activeTab === 'img2pdf' && <ImageToPdfTool />}
            {activeTab === 'pdf2img' && <PdfToImageTool />}
            {activeTab === 'compress' && <CompressImageTool />}
            {activeTab === 'compresspdf' && <CompressPdfTool />}
            {activeTab === 'protect' && <ProtectPdfTool />}
          </div>
        </main>

        <footer className="footer-container">
          <div className="footer-content flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-600 text-sm font-medium">Novazeb mergeall</p>
            <a
              href="https://github.com/Novazeb/mergeall"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors"
              aria-label="GitHub Repository"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
