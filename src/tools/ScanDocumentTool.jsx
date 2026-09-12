import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCw,
  Sliders,
  Download,
  FileText,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Trash2,
  ScanLine,
  Crop,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Dropzone from '../components/Dropzone';
import ProgressBar from '../components/ProgressBar';
import { formatBytes, downloadBlob } from '../utils/formatters';
import { imagesToPdf } from '../utils/pdfUtils';
import {
  detectDocumentBounds,
  cropAndRotateImage,
  applyScannerFilter,
  canvasToBlob,
  rotateImageToDataUrl
} from '../utils/scannerUtils';
import { useToast } from '../context/ToastContext';

export default function ScanDocumentTool() {
  const [step, setStep] = useState('upload'); // 'upload' | 'crop' | 'filter'
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);

  // Normalized crop bounds (0..1)
  const [crop, setCrop] = useState({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  const [isDragging, setIsDragging] = useState(null); // 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, crop: null });

  // Cropped canvas base
  const [croppedCanvas, setCroppedCanvas] = useState(null);

  // Filter settings
  const [activeFilter, setActiveFilter] = useState('magic'); // 'magic' | 'bw' | 'grayscale' | 'original'
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cropContainerRef = useRef(null);
  const { showToast } = useToast();

  const handleFilesSelected = (files) => {
    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid document image (JPG, PNG, WebP).', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImageSrc(url);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    setStep('crop');
  };

  // Image load: run auto detection
  const handleImageLoaded = useCallback(() => {
    if (imageRef.current && imageRef.current.naturalWidth > 0) {
      try {
        const bounds = detectDocumentBounds(imageRef.current);
        setCrop(bounds);
      } catch {
        setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      }
    }
  }, []);

  // Ensure auto-detection runs even if image is cached / already loaded
  useEffect(() => {
    if (step === 'crop' && imageRef.current?.complete && imageRef.current?.naturalWidth > 0) {
      handleImageLoaded();
    }
  }, [step, imageSrc, handleImageLoaded]);

  // Auto-detect button
  const handleAutoDetect = () => {
    if (imageRef.current) {
      const bounds = detectDocumentBounds(imageRef.current);
      setCrop(bounds);
      showToast('Document boundaries detected automatically.', 'info');
    }
  };

  // Reset crop to full
  const handleResetCrop = () => {
    setCrop({ x: 0, y: 0, width: 1, height: 1 });
  };

  // Preset 5% margin
  const handlePresetMargin = () => {
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  // Rotate 90 deg clockwise directly on canvas image data
  const handleRotate = () => {
    if (!imageRef.current) return;
    try {
      const rotatedUrl = rotateImageToDataUrl(imageRef.current, 90);
      setImageSrc(rotatedUrl);
    } catch (err) {
      console.error(err);
    }
  };

  // Interactive Crop dragging
  const handlePointerDown = (handleType, e) => {
    e.preventDefault();
    setIsDragging(handleType);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop },
    });
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;
    const init = dragStart.crop;

    let next = { ...init };

    if (isDragging === 'move') {
      next.x = Math.max(0, Math.min(1 - init.width, init.x + dx));
      next.y = Math.max(0, Math.min(1 - init.height, init.y + dy));
    } else if (isDragging === 'tl') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.width = init.width + (init.x - newX);
      next.height = init.height + (init.y - newY);
      next.x = newX;
      next.y = newY;
    } else if (isDragging === 'tr') {
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      next.height = init.height + (init.y - newY);
      next.y = newY;
    } else if (isDragging === 'bl') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      next.width = init.width + (init.x - newX);
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
      next.x = newX;
    } else if (isDragging === 'br') {
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
    } else if (isDragging === 't') {
      const newY = Math.max(0, Math.min(init.y + init.height - 0.05, init.y + dy));
      next.height = init.height + (init.y - newY);
      next.y = newY;
    } else if (isDragging === 'b') {
      next.height = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
    } else if (isDragging === 'l') {
      const newX = Math.max(0, Math.min(init.x + init.width - 0.05, init.x + dx));
      next.width = init.width + (init.x - newX);
      next.x = newX;
    } else if (isDragging === 'r') {
      next.width = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
    }

    setCrop(next);
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Apply crop and move to filter step
  const handleApplyCrop = () => {
    if (!imageRef.current) return;
    try {
      const baseCanvas = cropAndRotateImage(imageRef.current, crop, 0);
      setCroppedCanvas(baseCanvas);
      setActiveFilter('magic');
      setBrightness(0);
      setContrast(0);
      setStep('filter');
    } catch (err) {
      console.error(err);
      showToast('Failed to crop document image.', 'error');
    }
  };

  // Render filtered result on preview canvas
  useEffect(() => {
    if (step === 'filter' && croppedCanvas && previewCanvasRef.current) {
      const out = applyScannerFilter(croppedCanvas, activeFilter, {
        brightness,
        contrast,
      });
      const canvas = previewCanvasRef.current;
      canvas.width = out.width;
      canvas.height = out.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(out, 0, 0);
    }
  }, [step, croppedCanvas, activeFilter, brightness, contrast]);

  // Export as JPG
  const handleDownloadJpg = async () => {
    if (!previewCanvasRef.current) return;
    setIsExporting(true);
    try {
      const blob = await canvasToBlob(previewCanvasRef.current, 'image/jpeg', 0.92);
      const baseName = imageFile?.name?.replace(/\.[^/.]+$/, '') || 'scanned_doc';
      downloadBlob(blob, `${baseName}_scan.jpg`);
      confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
      showToast('Scanned image downloaded successfully (JPG)!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to download JPG image.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export as PDF
  const handleDownloadPdf = async () => {
    if (!previewCanvasRef.current) return;
    setIsExporting(true);
    setExportProgress(20);

    try {
      const blob = await canvasToBlob(previewCanvasRef.current, 'image/jpeg', 0.92);
      setExportProgress(50);
      const pdfFileObj = new File([blob], 'scanned_document.jpg', { type: 'image/jpeg' });
      const pdfBlob = await imagesToPdf([pdfFileObj], { pageSize: 'A4', orientation: 'auto', margin: 10 }, (p) => {
        setExportProgress(50 + Math.round(p * 0.5));
      });

      const baseName = imageFile?.name?.replace(/\.[^/.]+$/, '') || 'scanned_doc';
      downloadBlob(pdfBlob, `${baseName}_scan.pdf`);
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      showToast('Scanned PDF document downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to convert scan to PDF.', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const resetAll = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageFile(null);
    setImageSrc(null);
    setCroppedCanvas(null);
    setStep('upload');
    setIsExporting(false);
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">Scan Document</h2>
        <p className="tool-description">
          Transform document photos into crisp, clean scans like CamScanner. Auto-crop paper boundaries, remove shadows, and export to JPG or PDF.
        </p>
      </div>

      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <Dropzone
            onFilesSelected={handleFilesSelected}
            accept="image/*"
            multiple={false}
            title="Choose or drop document photo here"
            subtitle="Supports JPG, PNG, or WebP directly from your device"
            iconType="image"
          />

          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-xs text-slate-400">&mdash; or &mdash;</span>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn-secondary flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Take Photo with Camera</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelected(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      )}

      {step === 'crop' && (
        <div className="flex flex-col gap-4">
          {/* File summary & toolbar */}
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">PHOTO</div>
              <div className="truncate">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{imageFile?.name}</h4>
                <p className="text-xs text-slate-500">
                  {formatBytes(imageFile?.size || 0)} &bull; Adjust paper boundaries
                </p>
              </div>
            </div>

            <button onClick={resetAll} className="btn-danger-outline">
              <Trash2 className="w-4 h-4" /> Change Photo
            </button>
          </div>

          {/* Crop Action Controls */}
          <div className="selection-controls-bar">
            <div className="quick-select-buttons">
              <button onClick={handleAutoDetect} className="btn-pill flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5" /> Auto Detect
              </button>
              <button onClick={handleResetCrop} className="btn-pill flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5" /> Select Full
              </button>
              <button onClick={handlePresetMargin} className="btn-pill flex items-center gap-1.5">
                5% Margin
              </button>
              <button onClick={handleRotate} className="btn-pill flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Drag corners or edges to align with document boundaries.
            </span>
          </div>

          {/* Interactive Crop Area */}
          <div className="p-4 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden min-h-[360px]">
            <div
              ref={cropContainerRef}
              className="relative inline-block select-none"
              style={{ maxHeight: '500px', touchAction: 'none' }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Document Preview"
                onLoad={handleImageLoaded}
                style={{
                  maxHeight: '480px',
                  maxWidth: '100%',
                  display: 'block',
                  userSelect: 'none',
                }}
              />

              {/* Crop Bounding Box Overlay */}
              <div
                className="absolute border-2 border-indigo-600 bg-indigo-500/10 cursor-move ring-1 ring-white/70"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
              >
                {/* 3x3 Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-indigo-500/30" />
                  <div className="border-r border-b border-indigo-500/30" />
                  <div className="border-b border-indigo-500/30" />
                  <div className="border-r border-b border-indigo-500/30" />
                  <div className="border-r border-b border-indigo-500/30" />
                  <div className="border-b border-indigo-500/30" />
                  <div className="border-r border-b border-indigo-500/30" />
                  <div className="border-r border-b border-indigo-500/30" />
                  <div />
                </div>

                {/* 4 Corner Handles */}
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize -left-2.5 -top-2.5 flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('tl', e); }}
                >
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full pointer-events-none" />
                </div>
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize -right-2.5 -top-2.5 flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('tr', e); }}
                >
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full pointer-events-none" />
                </div>
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize -left-2.5 -bottom-2.5 flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('bl', e); }}
                >
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full pointer-events-none" />
                </div>
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize -right-2.5 -bottom-2.5 flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('br', e); }}
                >
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full pointer-events-none" />
                </div>

                {/* 4 Edge Handles */}
                <div
                  className="absolute w-8 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-sm cursor-ns-resize left-1/2 -top-1.5 -translate-x-1/2"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('t', e); }}
                />
                <div
                  className="absolute w-8 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-sm cursor-ns-resize left-1/2 -bottom-1.5 -translate-x-1/2"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('b', e); }}
                />
                <div
                  className="absolute w-3 h-8 bg-white border-2 border-indigo-600 rounded-full shadow-sm cursor-ew-resize -left-1.5 top-1/2 -translate-y-1/2"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('l', e); }}
                />
                <div
                  className="absolute w-3 h-8 bg-white border-2 border-indigo-600 rounded-full shadow-sm cursor-ew-resize -right-1.5 top-1/2 -translate-y-1/2"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown('r', e); }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={resetAll} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleApplyCrop} className="btn-primary">
              <Check className="w-4 h-4" /> Apply Crop & Continue
            </button>
          </div>
        </div>
      )}

      {step === 'filter' && (
        <div className="flex flex-col gap-4">
          <div className="split-file-bar">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="file-badge">SCAN</div>
              <div className="truncate">
                <h4 className="text-sm font-semibold text-slate-900 truncate">{imageFile?.name}</h4>
                <p className="text-xs text-slate-500">
                  Select lighting filter to enhance readability
                </p>
              </div>
            </div>

            <button onClick={() => setStep('crop')} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" /> Edit Crop
            </button>
          </div>

          {/* Filter Selection Panel */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Document Filter
              </span>
              <span className="text-xs text-slate-500">
                Active: {activeFilter === 'magic' ? 'Magic Color' : activeFilter === 'bw' ? 'B&W Document' : activeFilter === 'grayscale' ? 'Grayscale' : 'Original'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('magic')}
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  activeFilter === 'magic'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">Magic Color</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Crisp white paper, vibrant ink & stamp colors.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('bw')}
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  activeFilter === 'bw'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">B&W Document</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  High-contrast black text like an official photocopy.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('grayscale')}
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  activeFilter === 'grayscale'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-900">Grayscale</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Smooth grayscale with balanced contrast.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('original')}
                className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                  activeFilter === 'original'
                    ? 'bg-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-900">Original</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Keep original photo colors without enhancements.
                </p>
              </button>
            </div>

            {/* Fine Tuning Sliders */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Brightness</span>
                  <span className="font-semibold">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="quality-slider"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Contrast</span>
                  <span className="font-semibold">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="quality-slider"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Canvas */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-auto min-h-[360px]">
            <canvas
              ref={previewCanvasRef}
              className="max-h-[500px] max-w-full rounded shadow-sm border border-slate-300 bg-white"
            />
          </div>

          {isExporting && (
            <ProgressBar progress={exportProgress} label="Preparing scanned document..." />
          )}

          {/* Action Download Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <button onClick={resetAll} className="btn-secondary">
              <RefreshCw className="w-4 h-4" /> Scan Another Document
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadJpg}
                disabled={isExporting}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download JPG
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

