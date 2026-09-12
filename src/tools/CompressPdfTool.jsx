import React, { useState } from 'react';
import { Download, RefreshCw, Check, Trash2, ShieldCheck, AlertCircle, FileText, Camera, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { compressPdf, optimizeVectorPdf } from '../utils/pdfUtils';
import { inspectPdfContent } from '../utils/pdfRenderer';
import { useToast } from '../context/ToastContext';

export default function CompressPdfTool() {
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [mode, setMode] = useState('vector');
  const [preset, setPreset] = useState('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedResult, setCompressedResult] = useState(null);

  const { showToast } = useToast();

  const handleFileSelected = async (files) => {
    const pdf = files[0];
    if (!pdf || (!pdf.type.includes('pdf') && !pdf.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Please select a valid PDF file.', 'error');
      return;
    }

    setFile(pdf);
    setCompressedResult(null);
    setIsProcessing(true);
    setProgress(20);

    try {
      const inspect = await inspectPdfContent(pdf);
      setInspection(inspect);
      setMode(inspect.isVectorText ? 'vector' : 'scan');
    } catch {
      setInspection({ isVectorText: false });
      setMode('scan');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(15);

    try {
      let blob;
      if (mode === 'vector') {
        blob = await optimizeVectorPdf(file, (p) => setProgress(p));
      } else {
        blob = await compressPdf(file, preset, (p) => setProgress(p));
      }

      const isLarger = blob.size >= file.size;
      const savingPercent = isLarger
        ? Math.round(((blob.size - file.size) / file.size) * 100)
        : Math.round(((file.size - blob.size) / file.size) * 100);

      setCompressedResult({
        blob,
        size: blob.size,
        savingPercent,
        isLarger,
      });

      setIsProcessing(false);

      if (!isLarger) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        showToast('PDF compressed successfully!', 'success');
      }
    } catch (err) {
      console.error('PDF compression error:', err);
      setIsProcessing(false);
      showToast('Failed to process PDF file.', 'error');
    }
  };

  const handleDownload = () => {
    if (!compressedResult || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(compressedResult.blob, `${baseName}_compressed.pdf`);
  };

  const resetAll = () => {
    setFile(null);
    setInspection(null);
    setCompressedResult(null);
    setProgress(0);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Compress PDF</h2>
        <p className="tool-description">
          Optimize digital text documents or reduce scanned PDF size right in your browser.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          multiple={false}
          title="Choose or drop a PDF file here"
          subtitle="Files are processed directly in your browser without server upload"
          iconType="pdf"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* File Information Bar */}
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PDF</div>
              <div className="truncate">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  Original Size: {formatBytes(file.size)} &bull; {inspection?.isVectorText ? 'Digital Text Format' : 'Scanned Image Format'}
                </p>
              </div>
            </div>

            <button onClick={resetAll} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Change File
            </button>
          </div>

          {/* Mode Selection Cards */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Document Type
              </span>
              {inspection?.isVectorText && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                  <FileText className="w-3.5 h-3.5" /> Digital Text Detected
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setMode('vector'); setCompressedResult(null); }}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                  mode === 'vector'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${mode === 'vector' ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="text-sm font-bold text-slate-900">Digital / Text Document</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Preserves 100% crisp vector text quality. Best for documents exported from Word, Canva, or Google Docs.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setMode('scan'); setCompressedResult(null); }}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                  mode === 'scan'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Camera className={`w-4 h-4 ${mode === 'scan' ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="text-sm font-bold text-slate-900">Scanned / Image Document</span>
                </div>
                <p className="text-xs text-slate-500 leading-normal">
                  Image compression for large scanned files or phone photos (target under 300KB).
                </p>
              </button>
            </div>

            {/* Advisory Info when user selects scan mode for a vector document */}
            {mode === 'scan' && inspection?.isVectorText && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  This document contains digital text. Converting digital text into raster images can make characters blurry and increase file size.
                </span>
              </div>
            )}

            {/* Presets row for Scan mode */}
            {mode === 'scan' && (
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-xs font-medium text-slate-700">Compression Resolution:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreset('light')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold text-center cursor-pointer transition-all ${
                      preset === 'light'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Light (150 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('recommended')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold text-center cursor-pointer transition-all ${
                      preset === 'recommended'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Balanced (120 DPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('extreme')}
                    className={`py-2 px-3 rounded-md border text-xs font-semibold text-center cursor-pointer transition-all ${
                      preset === 'extreme'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Maximum (90 DPI)
                  </button>
                </div>
              </div>
            )}
          </div>

          {isProcessing && (
            <ProgressBar progress={progress} label="Optimizing PDF in browser..." />
          )}

          {/* Result Panel */}
          {compressedResult ? (
            compressedResult.isLarger ? (
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-lg flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-slate-900">Original File is Already Optimal</h4>
                    <p className="text-xs text-slate-600 leading-normal">
                      Original size is <strong>{formatBytes(file.size)}</strong>, compressed result is <strong>{formatBytes(compressedResult.size)}</strong>. 
                      Digital text documents are already optimally compressed. It is recommended to keep the original file to prevent blurry text.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200">
                  <button onClick={resetAll} className="btn-secondary">
                    Keep Original File
                  </button>
                  <button onClick={handleDownload} className="btn-primary">
                    <Download className="w-4 h-4" /> Download Anyway ({formatBytes(compressedResult.size)})
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Optimization Complete</h4>
                      <p className="text-xs text-slate-600">File size successfully reduced.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-emerald-200">
                    <span className="text-xs text-slate-400 line-through">{formatBytes(file.size)}</span>
                    <span className="text-xs font-bold text-slate-900">&rarr;</span>
                    <span className="text-xs font-bold text-emerald-700">{formatBytes(compressedResult.size)}</span>
                    <span className="text-xs font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                      -{compressedResult.savingPercent}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200/60">
                  <button onClick={handleCompress} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                  <button onClick={handleDownload} className="btn-primary">
                    <Download className="w-4 h-4" /> Download PDF ({formatBytes(compressedResult.size)})
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="btn-primary btn-hero"
              >
                {mode === 'vector' ? 'Optimize Text Document' : 'Compress Scanned PDF Now'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
