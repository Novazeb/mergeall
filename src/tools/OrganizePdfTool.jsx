import React, { useState } from 'react';
import { RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, Download, RefreshCw, Check, Undo2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { getPdfPageThumbnails } from '../utils/pdfRenderer';
import { organizePdf } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

export default function OrganizePdfTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [originalPages, setOriginalPages] = useState([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  const { showToast } = useToast();

  const handleFileSelected = async (files) => {
    const pdf = files[0];
    if (!pdf || (!pdf.type.includes('pdf') && !pdf.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Pilih file PDF yang valid.', 'error');
      return;
    }

    setFile(pdf);
    setResultBlob(null);
    setIsLoadingThumbs(true);
    setLoadProgress(10);

    try {
      const { thumbnails } = await getPdfPageThumbnails(pdf, 0.35, (p) => setLoadProgress(p));
      const initialPages = thumbnails.map((thumb, idx) => ({
        id: `page-${idx}-${Date.now()}`,
        originalIndex: idx,
        pageNum: idx + 1,
        dataUrl: thumb.dataUrl,
        rotation: 0,
      }));

      setPages(initialPages);
      setOriginalPages(initialPages);
      setIsLoadingThumbs(false);
    } catch (err) {
      console.error(err);
      setIsLoadingThumbs(false);
      showToast('Gagal memuat halaman PDF. File mungkin terenkripsi atau rusak.', 'error');
    }
  };

  const rotatePage = (index, delta) => {
    setPages((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const newRotation = (current.rotation + delta + 360) % 360;
      updated[index] = { ...current, rotation: newRotation };
      return updated;
    });
    setResultBlob(null);
  };

  const rotateAll = (delta) => {
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        rotation: (page.rotation + delta + 360) % 360,
      }))
    );
    setResultBlob(null);
  };

  const movePage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[target];
      updated[target] = temp;
      return updated;
    });
    setResultBlob(null);
  };

  const deletePage = (index) => {
    if (pages.length <= 1) {
      showToast('PDF harus menyisakan minimal 1 halaman.', 'info');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
    setResultBlob(null);
  };

  const resetPages = () => {
    setPages(originalPages);
    setResultBlob(null);
  };

  const handleSave = async () => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(10);

    try {
      const pageConfigs = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const blob = await organizePdf(file, pageConfigs, (p) => setProcessProgress(p));
      setResultBlob(blob);
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('PDF berhasil diatur dan disimpan!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Gagal memproses file PDF.', 'error');
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(resultBlob, `${baseName}_organized.pdf`);
  };

  const resetAll = () => {
    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setResultBlob(null);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Atur & Putar Halaman PDF</h2>
        <p className="tool-description">
          Putar orientasi halaman, susun ulang posisi urutan, atau hapus halaman yang tidak diperlukan.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          multiple={false}
          title="Pilih atau seret file PDF ke sini"
          subtitle="File diproses langsung di browser Anda"
          iconType="pdf"
        />
      ) : isLoadingThumbs ? (
        <div className="p-8">
          <ProgressBar progress={loadProgress} label={`Membuat thumbnail halaman ${file.name}...`} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* File Bar */}
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PDF</div>
              <div className="truncate">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {pages.length} Halaman &bull; {formatBytes(file.size)}
                </p>
              </div>
            </div>

            <button onClick={resetAll} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Ganti File
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="selection-controls-bar">
            <div className="quick-select-buttons">
              <button onClick={() => rotateAll(90)} className="btn-pill flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" /> Putar Semua +90°
              </button>
              <button onClick={() => rotateAll(-90)} className="btn-pill flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Putar Semua -90°
              </button>
              <button onClick={resetPages} className="btn-pill flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5" /> Reset Urutan
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Gunakan panah untuk geser urutan, ikon putar untuk rotasi.
            </span>
          </div>

          {/* Pages Grid */}
          <div className="pages-grid">
            {pages.map((page, idx) => (
              <div key={page.id} className="page-thumb-card">
                <div className="page-thumb-header">
                  <span className="text-xs font-semibold text-slate-700">
                    Hal. {idx + 1}
                  </span>
                  {page.rotation !== 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {page.rotation}°
                    </span>
                  )}
                </div>

                <div className="page-thumb-img-wrapper">
                  <img
                    src={page.dataUrl}
                    alt={`Halaman ${idx + 1}`}
                    style={{
                      transform: `rotate(${page.rotation}deg)`,
                      transition: 'transform 0.15s ease-in-out',
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => movePage(idx, -1)}
                      disabled={idx === 0}
                      title="Geser ke kiri"
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      title="Geser ke kanan"
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => rotatePage(idx, 90)}
                      title="Putar 90 derajat"
                      className="btn-icon text-indigo-600"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletePage(idx)}
                      title="Hapus halaman"
                      className="btn-icon text-rose-600"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isProcessing && (
            <ProgressBar progress={processProgress} label="Menyimpan susunan PDF..." />
          )}

          {resultBlob ? (
            <div className="success-banner">
              <div className="success-info">
                <Check className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-sm">Susunan PDF Selesai</h4>
                  <p className="text-xs">File PDF baru siap diunduh.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Simpan Ulang
                </button>
                <button onClick={handleDownload} className="btn-primary">
                  <Download className="w-4 h-4" /> Unduh PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isProcessing || pages.length === 0}
                className="btn-primary btn-hero"
              >
                Terapkan Perubahan & Simpan PDF ({pages.length} Halaman)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
