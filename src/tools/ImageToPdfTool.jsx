import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Download, ImagePlus, Plus, RefreshCw, Trash2, Check, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { getImageMetadata } from '../utils/imageUtils';
import { imagesToPdf } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

export default function ImageToPdfTool() {
  const [items, setItems] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(10);
  const [outputFilename, setOutputFilename] = useState('images_converted.pdf');

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfBlob, setPdfBlob] = useState(null);

  const { showToast } = useToast();

  const handleFilesAdded = async (files) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));

    if (validImages.length === 0) {
      showToast('Please select valid image files.', 'error');
      return;
    }

    const newItems = [];
    for (const file of validImages) {
      const id = Date.now() + Math.random().toString();
      try {
        const meta = await getImageMetadata(file);
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          previewUrl: meta.previewUrl,
          dimensions: `${meta.width} × ${meta.height}`
        });
      } catch (e) {
        showToast(`Could not load image ${file.name}`, 'error');
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setPdfBlob(null);
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
    setPdfBlob(null);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    setPdfBlob(null);
  };

  const clearAll = () => {
    setItems([]);
    setPdfBlob(null);
  };

  const handleConvert = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      const imageFiles = items.map(item => item.file);
      const blob = await imagesToPdf(imageFiles, {
        pageSize,
        orientation,
        margin: Number(margin)
      }, (p) => setProgress(p));

      setPdfBlob(blob);
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('Images converted to PDF successfully!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to convert images to PDF.', 'error');
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      downloadBlob(pdfBlob, outputFilename || 'images_converted.pdf');
    }
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Convert Images to PDF</h2>
        <p className="tool-description">
          Convert one or multiple photos (JPG, PNG, WebP) into a single clean PDF with custom page orientation, margin, and paper size.
        </p>
      </div>

      {items.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesAdded}
          accept="image/*,.jpg,.jpeg,.png,.webp"
          title="Drop images here to convert to PDF"
          subtitle="Supports JPG, PNG, and WebP format"
          iconType="image"
        />
      ) : (
        <div className="img2pdf-workspace">
          <div className="workspace-toolbar">
            <div className="toolbar-stats">
              <span className="stat-pill">{items.length} Images</span>
              <span className="stat-pill">Total: {formatBytes(items.reduce((s, i) => s + i.size, 0))}</span>
            </div>

            <div className="toolbar-actions">
              <label className="btn-add-more">
                <Plus className="w-4 h-4" /> Add More Photos
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFilesAdded(Array.from(e.target.files));
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>
              <button onClick={clearAll} className="btn-danger-outline">
                <Trash2 className="w-4 h-4" /> Clear All
              </button>
            </div>
          </div>

          <div className="pdf-options-bar grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="setting-card">
              <label className="setting-label">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(e.target.value); setPdfBlob(null); }}
                className="input-select-sm"
              >
                <option value="A4">A4 Standard</option>
                <option value="Letter">US Letter</option>
                <option value="Fit">Fit to Image Size</option>
              </select>
            </div>

            <div className="setting-card">
              <label className="setting-label">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => { setOrientation(e.target.value); setPdfBlob(null); }}
                className="input-select-sm"
                disabled={pageSize === 'Fit'}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="auto">Auto (Match Image Ratio)</option>
              </select>
            </div>

            <div className="setting-card">
              <label className="setting-label">Margin</label>
              <select
                value={margin}
                onChange={(e) => { setMargin(e.target.value); setPdfBlob(null); }}
                className="input-select-sm"
              >
                <option value="0">No Margin (Full Bleed)</option>
                <option value="10">Small (10mm)</option>
                <option value="20">Big (20mm)</option>
              </select>
            </div>

            <div className="setting-card">
              <label className="setting-label">Output Filename</label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="images_converted.pdf"
                className="input-text-sm"
              />
            </div>
          </div>

          <div className="image-reorder-grid">
            {items.map((item, idx) => (
              <div key={item.id} className="image-reorder-card">
                <div className="card-index-badge">{idx + 1}</div>
                <div className="image-card-preview">
                  <img src={item.previewUrl} alt={item.name} />
                </div>
                <div className="image-card-info">
                  <span className="image-card-name" title={item.name}>{item.name}</span>
                  <span className="text-xs text-slate-500">{item.dimensions} &bull; {formatBytes(item.size)}</span>
                </div>
                <div className="image-card-controls">
                  <button
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move Left"
                    className="btn-icon"
                  >
                    <ArrowUp className="w-4 h-4 md:rotate-0" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    title="Move Right"
                    className="btn-icon"
                  >
                    <ArrowDown className="w-4 h-4 md:rotate-0" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    className="btn-icon text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {isProcessing && (
            <ProgressBar progress={progress} label="Creating PDF document from images..." />
          )}

          {pdfBlob ? (
            <div className="success-banner">
              <div className="success-info">
                <Check className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="font-semibold">PDF Created Successfully!</h4>
                  <p className="text-sm">
                    Compiled {items.length} images into single PDF.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDownload} className="btn-primary">
                  <Download className="w-5 h-5" /> Download PDF
                </button>
                <button onClick={handleConvert} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Re-generate
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConvert}
              disabled={isProcessing || items.length === 0}
              className="btn-primary btn-hero"
            >
              <ImagePlus className="w-5 h-5" /> Convert {items.length} Images to PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
