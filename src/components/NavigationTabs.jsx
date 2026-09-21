import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  RotateCw,
  Minimize2,
  Gauge,
  ImagePlus,
  FileImage,
  Lock,
  Info,
  X,
  ShieldCheck,
  ScanLine,
  QrCode
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize' },
  { id: 'convert', label: 'Convert' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'security', label: 'Security' },
  { id: 'office', label: 'Office to PDF (Info)' },
];

const TABS = [
  { id: 'merge', label: 'Merge PDF', icon: Layers, desc: 'Combine multiple PDF files', category: 'organize' },
  { id: 'split', label: 'Split & Extract', icon: Scissors, desc: 'Extract or separate pages', category: 'organize' },
  { id: 'organize', label: 'Organize & Rotate', icon: RotateCw, desc: 'Reorder and rotate pages', category: 'organize' },
  { id: 'scan', label: 'Scan Document', icon: ScanLine, desc: 'Clean document scan from photo', category: 'convert' },
  { id: 'qrcode', label: 'URL to QR Code', icon: QrCode, desc: 'Generate QR code with watermark', category: 'convert' },
  { id: 'img2pdf', label: 'Image to PDF', icon: ImagePlus, desc: 'Convert JPG/PNG to PDF', category: 'convert' },
  { id: 'pdf2img', label: 'PDF to Image', icon: FileImage, desc: 'Export pages to photos', category: 'convert' },
  { id: 'compress', label: 'Compress Image', icon: Minimize2, desc: 'Reduce image file size', category: 'optimize' },
  { id: 'compresspdf', label: 'Compress PDF', icon: Gauge, desc: 'Reduce PDF file size', category: 'optimize' },
  { id: 'protect', label: 'Protect PDF', icon: Lock, desc: 'Password protect PDF', category: 'security' },
];

export default function NavigationTabs({ activeTab, setActiveTab }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOfficeModal, setShowOfficeModal] = useState(false);

  const handleCategoryClick = (catId) => {
    if (catId === 'office') {
      setShowOfficeModal(true);
      return;
    }

    setSelectedCategory(catId);
    if (catId !== 'all') {
      const tabsInCat = TABS.filter(t => t.category === catId);
      const isCurrentInCat = tabsInCat.some(t => t.id === activeTab);
      if (!isCurrentInCat && tabsInCat.length > 0) {
        setActiveTab(tabsInCat[0].id);
      }
    }
  };

  const filteredTabs = selectedCategory === 'all'
    ? TABS
    : TABS.filter(tab => tab.category === selectedCategory);

  return (
    <nav className="nav-tabs-wrapper">
      {/* Category Chips Bar */}
      <div className="category-filter-bar">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const isOffice = cat.id === 'office';
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`category-chip ${isActive ? 'active' : ''} ${isOffice ? 'border-dashed text-indigo-600' : ''}`}
            >
              {isOffice && <Info className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs Grid */}
      <div className="nav-tabs-list">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab-button ${isActive ? 'active' : ''}`}
            >
              <div className="nav-tab-icon">
                <Icon className="w-4 h-4" />
              </div>
              <div className="nav-tab-text">
                <span className="nav-tab-title">{tab.label}</span>
                <span className="nav-tab-desc">{tab.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Office Limitation Modal */}
      {showOfficeModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">About Office Document Conversion</h3>
              </div>
              <button
                onClick={() => setShowOfficeModal(false)}
                className="btn-icon"
                style={{ width: '28px', height: '28px' }}
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="py-4 flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 text-sm">
                Why is there no PDF to Word / Excel / PowerPoint conversion?
              </p>
              <p>
                <strong>MergeAll</strong> strictly maintains <strong>100% In-Browser Privacy</strong>. All document processing runs locally in your device memory without ever uploading your files to any external server.
              </p>
              <p>
                Converting binary Microsoft Office formats (DOCX, XLSX, PPTX) requires backend servers running LibreOffice or third-party cloud APIs. Sending your files to external servers poses privacy and data security risks.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                <strong>Tip:</strong> To create a PDF from Word, Excel, or PowerPoint, open the file in Microsoft Office or Google Docs and select <strong>File &rarr; Save As PDF / Download PDF</strong>.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowOfficeModal(false)}
                className="btn-primary"
              >
                Close Information
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
