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
  ShieldCheck
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Semua Fitur' },
  { id: 'organize', label: 'Organize' },
  { id: 'convert', label: 'Convert' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'security', label: 'Security' },
  { id: 'office', label: 'Office to PDF (Info)' },
];

const TABS = [
  { id: 'merge', label: 'Merge PDF', icon: Layers, desc: 'Gabung banyak file PDF', category: 'organize' },
  { id: 'split', label: 'Split & Extract', icon: Scissors, desc: 'Pisah atau ambil halaman', category: 'organize' },
  { id: 'organize', label: 'Atur & Putar', icon: RotateCw, desc: 'Rotasi dan susun urutan', category: 'organize' },
  { id: 'img2pdf', label: 'Gambar ke PDF', icon: ImagePlus, desc: 'Ubah JPG/PNG ke PDF', category: 'convert' },
  { id: 'pdf2img', label: 'PDF ke Gambar', icon: FileImage, desc: 'Ekspor halaman ke foto', category: 'convert' },
  { id: 'compress', label: 'Kompres Gambar', icon: Minimize2, desc: 'Kecilkan ukuran gambar', category: 'optimize' },
  { id: 'compresspdf', label: 'Kompres PDF', icon: Gauge, desc: 'Kecilkan ukuran file PDF', category: 'optimize' },
  { id: 'protect', label: 'Kunci PDF', icon: Lock, desc: 'Beri proteksi password', category: 'security' },
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
                <h3 className="text-base font-bold text-slate-900">Tentang Konversi Dokumen Office</h3>
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
                Mengapa tidak ada konversi PDF ke Word / Excel / PowerPoint?
              </p>
              <p>
                <strong>MergeAll</strong> menjaga <strong>100% Privasi di Browser</strong>. Seluruh proses dokumen berjalan di memori lokal laptop/HP Anda, tanpa pernah diunggah ke server mana pun.
              </p>
              <p>
                Konversi format biner Microsoft Office (DOCX, XLSX, PPTX) membutuhkan server backend eksternal yang menjalankan LibreOffice atau API cloud pihak ketiga. Mengirim file ke server luar berisiko membocorkan data pribadi atau kerahasiaan berkas Anda.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                <strong>Tips:</strong> Untuk membuat PDF dari Word, Excel, atau PPT, cukup buka file di aplikasi Microsoft Office atau Google Docs, lalu pilih menu <strong>File &rarr; Simpan Sebagai PDF / Unduh PDF</strong>.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowOfficeModal(false)}
                className="btn-primary"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
