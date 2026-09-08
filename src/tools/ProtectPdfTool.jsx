import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Download, Check, RefreshCw, Trash2, ShieldCheck, KeyRound } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { protectPdf } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

export default function ProtectPdfTool() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [protectedBlob, setProtectedBlob] = useState(null);

  const { showToast } = useToast();

  const handleFileSelected = (files) => {
    const pdf = files[0];
    if (!pdf || (!pdf.type.includes('pdf') && !pdf.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Pilih file PDF yang valid.', 'error');
      return;
    }
    setFile(pdf);
    setProtectedBlob(null);
  };

  const handleProtect = async (e) => {
    e.preventDefault();

    if (!file) return;

    if (!password) {
      showToast('Masukkan password pengaman dokumen.', 'info');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok. Silakan cek kembali.', 'error');
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      const blob = await protectPdf(file, password, '', (p) => setProgress(p));
      setProtectedBlob(blob);
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('PDF berhasil dienkripsi dan dikunci!', 'success');
    } catch (err) {
      console.error('PDF protection error:', err);
      setIsProcessing(false);
      showToast('Gagal mengenkripsi PDF. File mungkin sudah terenkripsi.', 'error');
    }
  };

  const handleDownload = () => {
    if (!protectedBlob || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(protectedBlob, `${baseName}_protected.pdf`);
  };

  const resetAll = () => {
    setFile(null);
    setPassword('');
    setConfirmPassword('');
    setProtectedBlob(null);
    setProgress(0);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Kunci PDF dengan Password</h2>
        <p className="tool-description">
          Lindungi dokumen PDF Anda dengan enkripsi password langsung di memori browser.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          multiple={false}
          title="Pilih atau seret file PDF ke sini"
          subtitle="Password dan file diproses secara privat di perangkat Anda"
          iconType="pdf"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PDF</div>
              <div className="truncate">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {formatBytes(file.size)} &bull; Siap dienkripsi
                </p>
              </div>
            </div>

            <button onClick={resetAll} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Ganti File
            </button>
          </div>

          <form onSubmit={handleProtect} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wide">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Atur Password Dokumen</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="input-text w-full pr-10"
                    disabled={isProcessing}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-half btn-icon"
                    style={{ width: '24px', height: '24px', border: 'none', background: 'transparent' }}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Konfirmasi Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="input-text w-full"
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Aplikasi PDF viewer (Chrome, Edge, Adobe Acrobat, Apple Preview) akan meminta password ini untuk membuka dokumen.
              </span>
            </div>

            {!protectedBlob && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isProcessing || !password || !confirmPassword}
                  className="btn-primary btn-hero"
                >
                  <Lock className="w-4 h-4" /> Kunci Dokumen PDF Sekarang
                </button>
              </div>
            )}
          </form>

          {isProcessing && (
            <ProgressBar progress={progress} label="Mengenkripsi dokumen PDF di browser..." />
          )}

          {protectedBlob && (
            <div className="success-banner">
              <div className="success-info">
                <Check className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold">PDF Berhasil Diproteksi</h4>
                  <p className="text-xs">Hanya pengguna yang memiliki password yang dapat membuka file ini.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetAll} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Kunci File Lain
                </button>
                <button onClick={handleDownload} className="btn-primary">
                  <Download className="w-4 h-4" /> Unduh PDF Terproteksi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
