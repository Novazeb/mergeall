import React, { useState, useEffect } from 'react';
import { Check, Download, FileArchive, RefreshCw, Scissors, Sparkles, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, parsePageRange, downloadBlob } from '../utils/formatters';
import { getPdfPageThumbnails } from '../utils/pdfRenderer';
import { extractPdfPages, splitPdfToZip } from '../utils/pdfUtils';
import { useToast } from '../context/ToastContext';

export default function SplitPdfTool() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [rangeInput, setRangeInput] = useState('');
  
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  
  const [extractedResult, setExtractedResult] = useState(null); // { blob, type: 'pdf'|'zip', filename }
  const { showToast } = useToast();

  const handleFileSelected = async (files) => {
    const pdf = files[0];
    if (!pdf || (!pdf.type.includes('pdf') && !pdf.name.toLowerCase().endsWith('.pdf'))) {
      showToast('Please select a valid PDF file.', 'error');
      return;
    }

    setFile(pdf);
    setExtractedResult(null);
    setIsLoadingThumbs(true);
    setLoadProgress(5);

    try {
      const { numPages: total, thumbnails: thumbs } = await getPdfPageThumbnails(pdf, 0.4, (p) => setLoadProgress(p));
      setNumPages(total);
      setThumbnails(thumbs);
      // Default: select all pages
      const allPages = Array.from({ length: total }, (_, i) => i + 1);
      setSelectedPages(allPages);
      setRangeInput(`1-${total}`);
      setIsLoadingThumbs(false);
    } catch (err) {
      console.error(err);
      setIsLoadingThumbs(false);
      showToast('Failed to read PDF pages. The file might be encrypted.', 'error');
    }
  };

  const togglePageSelection = (pageNum) => {
    let updated;
    if (selectedPages.includes(pageNum)) {
      updated = selectedPages.filter(p => p !== pageNum);
    } else {
      updated = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(updated);
    setRangeInput(updated.join(', '));
    setExtractedResult(null);
  };

  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    const parsed = parsePageRange(val, numPages);
    setSelectedPages(parsed);
    setExtractedResult(null);
  };

  const selectAll = () => {
    const all = Array.from({ length: numPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(`1-${numPages}`);
    setExtractedResult(null);
  };

  const selectNone = () => {
    setSelectedPages([]);
    setRangeInput('');
    setExtractedResult(null);
  };

  const selectOdd = () => {
    const odds = Array.from({ length: numPages }, (_, i) => i + 1).filter(p => p % 2 !== 0);
    setSelectedPages(odds);
    setRangeInput(odds.join(', '));
    setExtractedResult(null);
  };

  const selectEven = () => {
    const evens = Array.from({ length: numPages }, (_, i) => i + 1).filter(p => p % 2 === 0);
    setSelectedPages(evens);
    setRangeInput(evens.join(', '));
    setExtractedResult(null);
  };

  const handleExtractPdf = async () => {
    if (selectedPages.length === 0) {
      showToast('Please select at least 1 page to extract.', 'info');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);

    try {
      const blob = await extractPdfPages(file, selectedPages, (p) => setProcessProgress(p));
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}_extracted.pdf`;

      setExtractedResult({ blob, type: 'pdf', filename });
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('Pages extracted to PDF successfully!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to extract pages.', 'error');
    }
  };

  const handleSplitZip = async () => {
    if (selectedPages.length === 0) {
      showToast('Please select at least 1 page to split.', 'info');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);

    try {
      const zipBlob = await splitPdfToZip(file, selectedPages, (p) => setProcessProgress(p));
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const filename = `${baseName}_pages_split.zip`;

      setExtractedResult({ blob: zipBlob, type: 'zip', filename });
      setIsProcessing(false);

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      showToast('PDF pages split into ZIP archive successfully!', 'success');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showToast('Failed to split PDF into ZIP.', 'error');
    }
  };

  const resetTool = () => {
    setFile(null);
    setNumPages(0);
    setThumbnails([]);
    setSelectedPages([]);
    setRangeInput('');
    setExtractedResult(null);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Split & Extract PDF Pages</h2>
        <p className="tool-description">
          Preview thumbnail pages, select specific ranges, and extract into a new single PDF or split into individual page PDFs.
        </p>
      </div>

      {!file ? (
        <Dropzone
          onFilesSelected={handleFileSelected}
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop PDF file here to split or extract"
          subtitle="or click to browse from your computer"
          iconType="pdf"
        />
      ) : isLoadingThumbs ? (
        <div className="p-8">
          <ProgressBar progress={loadProgress} label={`Rendering ${file.name} page thumbnails...`} />
        </div>
      ) : (
        <div className="split-workspace">
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PDF</div>
              <div className="truncate">
                <h4 className="text-slate-900 font-semibold truncate">{file.name}</h4>
                <p className="text-xs text-slate-500">
                  {numPages} Pages &bull; {formatBytes(file.size)}
                </p>
              </div>
            </div>

            <button onClick={resetTool} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Change File
            </button>
          </div>

          <div className="selection-controls-bar">
            <div className="range-input-group">
              <label className="text-xs text-slate-700 font-medium">Page Range:</label>
              <input
                type="text"
                value={rangeInput}
                onChange={handleRangeInputChange}
                placeholder="e.g. 1-3, 5, 8-10"
                className="input-text-sm"
              />
            </div>

            <div className="quick-select-buttons">
              <button onClick={selectAll} className="btn-pill">Select All ({numPages})</button>
              <button onClick={selectNone} className="btn-pill">Clear</button>
              <button onClick={selectOdd} className="btn-pill">Odd Pages</button>
              <button onClick={selectEven} className="btn-pill">Even Pages</button>
            </div>
          </div>

          <div className="pages-grid">
            {thumbnails.map((thumb) => {
              const isSelected = selectedPages.includes(thumb.pageNum);
              return (
                <div
                  key={thumb.pageNum}
                  onClick={() => togglePageSelection(thumb.pageNum)}
                  className={`page-thumb-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="page-thumb-header">
                    <span className="page-number">Page {thumb.pageNum}</span>
                    <div className={`checkbox-indicator ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  <div className="page-thumb-img-wrapper">
                    <img src={thumb.dataUrl} alt={`Thumbnail Page ${thumb.pageNum}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {isProcessing && (
            <ProgressBar progress={processProgress} label="Extracting PDF pages..." />
          )}

          {extractedResult ? (
            <div className="success-banner">
              <div className="success-info">
                <Check className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="font-semibold">Extraction Complete!</h4>
                  <p className="text-sm">
                    Selected {selectedPages.length} pages converted to {extractedResult.type.toUpperCase()}.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadBlob(extractedResult.blob, extractedResult.filename)}
                  className="btn-primary"
                >
                  <Download className="w-5 h-5" /> Download {extractedResult.type === 'zip' ? 'ZIP Archive' : 'PDF File'}
                </button>
              </div>
            </div>
          ) : (
            <div className="action-buttons-group">
              <button
                onClick={handleExtractPdf}
                disabled={isProcessing || selectedPages.length === 0}
                className="btn-primary"
              >
                <Scissors className="w-5 h-5" /> Extract Selected to 1 PDF ({selectedPages.length} pages)
              </button>
              <button
                onClick={handleSplitZip}
                disabled={isProcessing || selectedPages.length === 0}
                className="btn-secondary"
              >
                <FileArchive className="w-5 h-5" /> Split into Separate PDFs (ZIP)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
