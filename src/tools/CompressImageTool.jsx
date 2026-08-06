import React, { useState } from 'react';
import { Download, Minimize2, Trash2, Plus, Sparkles, Image as ImageIcon, ArrowRight, Check, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { compressImage, compressImagesToZip, getImageMetadata } from '../utils/imageUtils';
import { useToast } from '../context/ToastContext';

export default function CompressImageTool() {
  const [items, setItems] = useState([]);
  const [quality, setQuality] = useState(75);
  const [maxWidthHeight, setMaxWidthHeight] = useState('');
  const [outputFormat, setOutputFormat] = useState('original');
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewModalItem, setPreviewModalItem] = useState(null);
  
  const { showToast } = useToast();

  const handleFilesSelected = async (files) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));

    if (validImages.length === 0) {
      showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
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
          originalSize: file.size,
          dimensions: `${meta.width} × ${meta.height}`,
          originalPreviewUrl: meta.previewUrl,
          compressedResult: null,
          isProcessingItem: false
        });
      } catch (err) {
        showToast(`Could not load image ${file.name}`, 'error');
      }
    }

    setItems(prev => [...prev, ...newItems]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  const handleCompressAll = async () => {
    if (items.length === 0) return;

    setIsCompressing(true);
    setProgress(5);

    const updatedItems = [...items];
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = updatedItems[i];
      try {
        const result = await compressImage(item.file, {
          quality: quality / 100,
          maxWidthOrHeight: maxWidthHeight ? parseInt(maxWidthHeight, 10) : undefined,
          outputFileType: outputFormat
        });

        updatedItems[i] = {
          ...item,
          compressedResult: result
        };
      } catch (err) {
        console.error('Failed compressing item', item.name, err);
        showToast(`Compression failed for ${item.name}`, 'error');
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setItems(updatedItems);
    setIsCompressing(false);

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    showToast('Image compression complete!', 'success');
  };

  const handleDownloadZip = async () => {
    const compressedResults = items
      .map(item => item.compressedResult)
      .filter(Boolean);

    if (compressedResults.length === 0) return;

    setIsCompressing(true);
    try {
      const zipBlob = await compressImagesToZip(compressedResults, (p) => setProgress(p));
      downloadBlob(zipBlob, 'mergeall_compressed_images.zip');
      setIsCompressing(false);
      showToast('Downloaded compressed images ZIP!', 'success');
    } catch (err) {
      console.error(err);
      setIsCompressing(false);
      showToast('Failed to create ZIP file.', 'error');
    }
  };

  const totalOriginalSize = items.reduce((sum, item) => sum + item.originalSize, 0);
  const totalCompressedSize = items.reduce((sum, item) => sum + (item.compressedResult?.compressedSize || item.originalSize), 0);
  const totalSavings = totalOriginalSize > 0 && totalCompressedSize < totalOriginalSize
    ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
    : 0;

  const hasCompressedResults = items.some(i => i.compressedResult !== null);

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Compress & Optimize Images</h2>
        <p className="tool-description">
          Shrink JPG, PNG, and WebP image file sizes instantly in browser with side-by-side quality controls.
        </p>
      </div>

      {items.length === 0 ? (
        <Dropzone
          onFilesSelected={handleFilesSelected}
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          title="Drop images here to compress"
          subtitle="Supports JPG, PNG, and WebP format"
          iconType="image"
        />
      ) : (
        <div className="compress-workspace">
          <div className="compress-settings-grid">
            <div className="setting-card">
              <div className="flex justify-between items-center mb-2">
                <label className="setting-label">Compression Quality: {quality}%</label>
                <span className="text-xs text-blue-600 font-semibold">
                  {quality > 85 ? 'High Quality' : quality > 50 ? 'Balanced' : 'Max Compression'}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="quality-slider"
              />
            </div>

            <div className="setting-card">
              <label className="setting-label">Max Width / Height (px)</label>
              <input
                type="number"
                value={maxWidthHeight}
                onChange={(e) => setMaxWidthHeight(e.target.value)}
                placeholder="Optional e.g. 1920"
                className="input-text-sm"
              />
            </div>

            <div className="setting-card">
              <label className="setting-label">Convert Format</label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="input-select-sm"
              >
                <option value="original">Keep Original Format</option>
                <option value="image/jpeg">Convert to JPG</option>
                <option value="image/png">Convert to PNG</option>
                <option value="image/webp">Convert to WebP</option>
              </select>
            </div>
          </div>

          <div className="workspace-toolbar">
            <div className="toolbar-stats">
              <span className="stat-pill">{items.length} Images</span>
              <span className="stat-pill">Total: {formatBytes(totalOriginalSize)}</span>
              {hasCompressedResults && (
                <span className="stat-pill text-emerald-700 font-semibold border-emerald-300 bg-emerald-50">
                  New Total: {formatBytes(totalCompressedSize)} (-{totalSavings}%)
                </span>
              )}
            </div>

            <div className="toolbar-actions">
              <label className="btn-add-more">
                <Plus className="w-4 h-4" /> Add More Images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFilesSelected(Array.from(e.target.files));
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>
              <button onClick={clearAll} className="btn-danger-outline">
                <Trash2 className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>

          <div className="compress-items-list">
            {items.map((item) => {
              const result = item.compressedResult;
              return (
                <div key={item.id} className="compress-item-card">
                  <div className="compress-item-preview">
                    <img src={result ? result.previewUrl : item.originalPreviewUrl} alt={item.name} />
                  </div>

                  <div className="compress-item-details">
                    <h4 className="compress-item-name" title={item.name}>{item.name}</h4>
                    <span className="text-xs text-slate-500">{item.dimensions}</span>

                    <div className="size-comparison-badge">
                      <span>{formatBytes(item.originalSize)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      {result ? (
                        <span className="font-bold text-emerald-600">
                          {formatBytes(result.compressedSize)} (-{result.savingPercent}%)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending...</span>
                      )}
                    </div>
                  </div>

                  <div className="compress-item-actions">
                    {result && (
                      <>
                        <button
                          onClick={() => setPreviewModalItem(item)}
                          className="btn-icon"
                          title="View Side-by-Side Comparison"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadBlob(result.compressedBlob, result.filename)}
                          className="btn-icon text-blue-600"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="btn-icon text-rose-600"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {isCompressing && (
            <ProgressBar progress={progress} label="Compressing images in browser..." />
          )}

          <div className="compress-actions-bar">
            <button
              onClick={handleCompressAll}
              disabled={isCompressing || items.length === 0}
              className="btn-primary btn-hero flex-1"
            >
              <Minimize2 className="w-5 h-5" /> Compress {items.length} Images Now
            </button>

            {hasCompressedResults && items.length > 1 && (
              <button
                onClick={handleDownloadZip}
                disabled={isCompressing}
                className="btn-secondary"
              >
                <Download className="w-5 h-5" /> Download All (ZIP)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Modal */}
      {previewModalItem && (
        <div className="modal-backdrop" onClick={() => setPreviewModalItem(null)}>
          <div className="modal-card max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Side-by-Side Comparison</h3>
              <button onClick={() => setPreviewModalItem(null)} className="btn-close">&times;</button>
            </div>
            <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="comparison-box">
                <span className="comparison-label">Before: {formatBytes(previewModalItem.originalSize)}</span>
                <img src={previewModalItem.originalPreviewUrl} alt="Original" />
              </div>
              <div className="comparison-box border-emerald-300">
                <span className="comparison-label text-emerald-700 font-semibold">
                  After: {formatBytes(previewModalItem.compressedResult.compressedSize)} (-{previewModalItem.compressedResult.savingPercent}%)
                </span>
                <img src={previewModalItem.compressedResult.previewUrl} alt="Compressed" />
              </div>
            </div>
            <div className="modal-footer flex justify-end">
              <button
                onClick={() => downloadBlob(previewModalItem.compressedResult.compressedBlob, previewModalItem.compressedResult.filename)}
                className="btn-primary"
              >
                <Download className="w-4 h-4" /> Download Compressed Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
