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
            {activeTab === 'img2pdf' && <ImageToPdfTool />}
            {activeTab === 'pdf2img' && <PdfToImageTool />}
            {activeTab === 'compress' && <CompressImageTool />}
            {activeTab === 'compresspdf' && <CompressPdfTool />}
            {activeTab === 'protect' && <ProtectPdfTool />}
          </div>
        </main>

        <footer className="footer-container">
          <div className="footer-content flex justify-center text-center">
            <p className="text-slate-600 text-sm font-medium">Novazeb mergeall</p>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
