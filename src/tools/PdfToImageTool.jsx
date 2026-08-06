import React, { useState } from 'react';
import { Download, FileArchive, FileImage, RefreshCw, Trash2, Check, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { renderPdfPagesToImages } from '../utils/pdfRenderer';
import { useToast } from '../context/ToastContext';

export default function PdfToImageTool() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('png');
  const [resolutionScale, setResolutionScale] = useState(2.0); // 2x HD default
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [renderedImages, setRenderedImages] = useState([]);
  
  const [previewImage, setPreviewImage] = useState(null);
  const { showToast } = useToast();

  const handleFileSelected = async (files) => {
    const pdf = files[0];
    if (!pdf || (!pdf.type.includes('pdf') && !pdf.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Please select a valid PDF file.', 'error');
      return;
    }

    setFile(pdf);
    setRenderedImages([]);
  };

  const handleRender = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(5);

    try {
      const images = await renderPdfPagesToImages(
        file,
        Number(resolutionScale),
        format,
        (p) => setProgress(p)
      );

      setRenderedImages(images);
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast(`Converted ${images.length} PDF pages to ${format.toUpperCase()} images!`, 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to convert PDF pages to images.', 'error');
    }
  };

  const handleDownloadAllZip = async () => {
    if (renderedImages.length === 0) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      const zip = new JSZip();
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      renderedImages.forEach((img) => {
        zip.file(img.filename, img.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setProgress(Math.round(metadata.percent));
      });

      downloadBlob(zipBlob, `${baseName}_images.zip`);
      setIsProcessing(false);
      showToast('Downloaded ZIP archive containing all images!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to bundle ZIP file.', 'error');
    }
  };

  const resetTool = () => {
    setFile(null);
    setRenderedImages([]);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Convert PDF to High-Res Images</h2>
        <p className="tool-description">
          Render PDF pages into high-definition PNG, JPG, or WebP graphic images with adjustable resolution.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop PDF file here to convert to images"
          subtitle="or click to browse from your computer"
          iconType="pdf"
        />
      ) : (
        <div className="pdf2img-workspace">
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PDF</div>
              <div className="truncate">
                <h4 className="text-slate-900 font-semibold truncate">{file.name}</h4>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>

            <button onClick={resetTool} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Change PDF
            </button>
          </div>

          <div className="pdf-options-bar grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="setting-card">
              <label className="setting-label">Export Image Format</label>
              <select
                value={format}
                onChange={(e) => { setFormat(e.target.value); setRenderedImages([]); }}
                className="input-select-sm"
              >
                <option value="png">PNG (Lossless & Transparent support)</option>
                <option value="jpeg">JPG (Standard Photo Format)</option>
                <option value="webp">WebP (Modern Compressed Web Image)</option>
              </select>
            </div>

            <div className="setting-card">
              <label className="setting-label">Resolution Scale</label>
              <select
                value={resolutionScale}
                onChange={(e) => { setResolutionScale(e.target.value); setRenderedImages([]); }}
                className="input-select-sm"
              >
                <option value="1.0">1x Standard (Normal Screen)</option>
                <option value="2.0">2x High Definition (Recommended)</option>
                <option value="3.0">3x Ultra HD (High Print Quality)</option>
              </select>
            </div>
          </div>

          {isProcessing && (
            <ProgressBar progress={progress} label="Rendering PDF pages to images..." />
          )}

          {renderedImages.length > 0 ? (
            <div>
              <div className="workspace-toolbar">
                <div className="toolbar-stats">
                  <span className="stat-pill text-emerald-700 font-semibold border-emerald-300 bg-emerald-50">
                    <Check className="w-3.5 h-3.5 inline mr-1" />
                    {renderedImages.length} Pages Exported
                  </span>
                </div>

                <div className="toolbar-actions">
                  <button onClick={handleDownloadAllZip} className="btn-primary">
                    <FileArchive className="w-4 h-4" /> Download All as ZIP
                  </button>
                  <button onClick={handleRender} className="btn-secondary">
                    <RefreshCw className="w-4 h-4" /> Re-render
                  </button>
                </div>
              </div>

              <div className="pages-images-grid">
                {renderedImages.map((img) => (
                  <div key={img.pageNum} className="page-image-card">
                    <div className="page-image-header">
                      <span>Page {img.pageNum}</span>
                      <span className="text-xs text-slate-500">{formatBytes(img.blob.size)}</span>
                    </div>

                    <div className="page-image-preview">
                      <img src={img.dataUrl} alt={`Page ${img.pageNum}`} />
                      <div className="preview-overlay">
                        <button
                          onClick={() => setPreviewImage(img)}
                          className="btn-icon bg-slate-900 text-white"
                          title="Full Zoom Preview"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="page-image-footer">
                      <button
                        onClick={() => downloadBlob(img.blob, img.filename)}
                        className="btn-primary w-full text-xs py-2"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Page {img.pageNum}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={handleRender}
              disabled={isProcessing}
              className="btn-primary btn-hero"
            >
              <FileImage className="w-5 h-5" /> Render PDF Pages to {format.toUpperCase()} Images
            </button>
          )}
        </div>
      )}

      {/* Full Image Preview Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="modal-card max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Page {previewImage.pageNum} Preview ({previewImage.width} × {previewImage.height}px)</h3>
              <button onClick={() => setPreviewImage(null)} className="btn-close">&times;</button>
            </div>
            <div className="modal-body flex justify-center bg-slate-100 p-4 rounded-xl max-h-[70vh] overflow-auto border border-slate-200">
              <img src={previewImage.dataUrl} alt={`Page ${previewImage.pageNum}`} className="max-w-full object-contain" />
            </div>
            <div className="modal-footer flex justify-between items-center mt-4">
              <span className="text-sm text-slate-600">{previewImage.filename} ({formatBytes(previewImage.blob.size)})</span>
              <button
                onClick={() => downloadBlob(previewImage.blob, previewImage.filename)}
                className="btn-primary"
              >
                <Download className="w-4 h-4" /> Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
