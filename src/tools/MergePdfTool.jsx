import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Download, RefreshCw, FileText, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { getPdfDocument, renderPdfPageToDataUrl } from '../utils/pdfRenderer';
import { mergePdfs } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

export default function MergePdfTool() {
  const [items, setItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedBlob, setMergedBlob] = useState(null);
  const [outputFilename, setOutputFilename] = useState('mergeall_combined.pdf');
  const { showToast } = useToast();

  const handleFilesAdded = async (files) => {
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      showToast('Please select valid PDF files.', 'error');
      return;
    }

    const newItems = [];
    for (const file of pdfFiles) {
      const id = Date.now() + Math.random().toString();
      try {
        const doc = await getPdfDocument(file);
        const pageCount = doc.numPages;
        let thumbUrl = null;
        try {
          const thumbObj = await renderPdfPageToDataUrl(doc, 1, 0.3);
          thumbUrl = thumbObj.dataUrl;
        } catch (e) {
          console.warn('Thumbnail generation failed for', file.name, e);
        }

        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          pageCount,
          thumbUrl
        });
      } catch (err) {
        showToast(`Could not read PDF file "${file.name}"`, 'error');
      }
    }

    setItems(prev => [...prev, ...newItems]);
    setMergedBlob(null);
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
    setMergedBlob(null);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    setMergedBlob(null);
  };

  const clearAll = () => {
    setItems([]);
    setMergedBlob(null);
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      showToast('Please add at least 2 PDF files to merge.', 'info');
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const filesToMerge = items.map(item => item.file);
      const blob = await mergePdfs(filesToMerge, (p) => setProgress(p));

      setMergedBlob(blob);
      setIsProcessing(false);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast('PDF files merged successfully!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to merge PDFs. One of the files might be encrypted or corrupted.', 'error');
    }
  };

  const handleDownload = () => {
    if (mergedBlob) {
      downloadBlob(mergedBlob, outputFilename || 'mergeall_combined.pdf');
    }
  };

  const totalPages = items.reduce((acc, curr) => acc + (curr.pageCount || 0), 0);
  const totalSize = items.reduce((acc, curr) => acc + (curr.size || 0), 0);

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Merge PDF Files</h2>
        <p className="tool-description">
          Combine 2 or more PDF documents into a single organized PDF. Reorder files before merging.
        </p>
      </div>

      {items.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesAdded}
          accept="application/pdf,.pdf"
          title="Drop PDF files here to merge"
          subtitle="or click to browse from your device"
          iconType="pdf"
        />
      ) : (
        <div className="merge-workspace">
          <div className="workspace-toolbar">
            <div className="toolbar-stats">
              <span className="stat-pill">{items.length} Files</span>
              <span className="stat-pill">{totalPages} Pages Total</span>
              <span className="stat-pill">{formatBytes(totalSize)}</span>
            </div>

            <div className="toolbar-actions">
              <label className="btn-add-more">
                <Plus className="w-4 h-4" />
                Add More PDFs
                <input
                  type="file"
                  accept="application/pdf,.pdf"
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

          <div className="file-list">
            {items.map((item, idx) => (
              <div key={item.id} className="file-item-card">
                <div className="file-item-index">{idx + 1}</div>
                
                <div className="file-item-thumb">
                  {item.thumbUrl ? (
                    <img src={item.thumbUrl} alt={`Page 1 of ${item.name}`} />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                <div className="file-item-info">
                  <span className="file-item-name" title={item.name}>{item.name}</span>
                  <div className="file-item-meta">
                    <span>{item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}</span>
                    <span>&bull;</span>
                    <span>{formatBytes(item.size)}</span>
                  </div>
                </div>

                <div className="file-item-controls">
                  <button
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    title="Move Up"
                    className="btn-icon"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === items.length - 1}
                    title="Move Down"
                    className="btn-icon"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    className="btn-icon text-rose-600 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="output-settings-panel">
            <div className="setting-group">
              <label className="setting-label">Output Filename</label>
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="mergeall_combined.pdf"
                className="input-text"
              />
            </div>
          </div>

          {isProcessing && (
            <ProgressBar progress={progress} label="Merging PDF documents..." />
          )}

          {mergedBlob ? (
            <div className="success-banner">
              <div className="success-info">
                <Check className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="font-semibold">Merge Complete!</h4>
                  <p className="text-sm">Your merged PDF is ready to download.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDownload} className="btn-primary">
                  <Download className="w-5 h-5" /> Download PDF
                </button>
                <button onClick={handleMerge} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Merge Again
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleMerge}
              disabled={isProcessing || items.length < 2}
              className="btn-primary btn-hero"
            >
              Merge PDFs Now ({items.length} files)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
