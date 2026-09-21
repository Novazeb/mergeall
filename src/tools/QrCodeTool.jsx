import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Copy,
  Check,
  Trash2,
  Clipboard,
  Link as LinkIcon,
  Palette,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  generateQrCanvasWithWatermark,
  generateQrSvgWithWatermark,
  BG_COLOR_OPTIONS,
  FG_COLOR_OPTIONS
} from '../utils/qrUtils';
import { downloadBlob } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export default function QrCodeTool() {
  const [text, setText] = useState('https://mergeall.app');
  const [size, setSize] = useState(512); // Default 512px for high quality
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState('M');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#0f172a');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef(null);
  const { showToast } = useToast();

  // Generate QR Canvas whenever text or options change
  useEffect(() => {
    let isCancelled = false;

    async function renderQR() {
      if (!canvasRef.current) return;
      setIsGenerating(true);

      try {
        const sourceCanvas = await generateQrCanvasWithWatermark(text || 'https://', {
          size,
          errorCorrectionLevel,
          margin: 2,
          fgColor,
          bgColor,
        });

        if (isCancelled) return;

        const targetCanvas = canvasRef.current;
        targetCanvas.width = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(sourceCanvas, 0, 0);
      } catch (err) {
        console.error('Failed to render QR Code:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    }

    renderQR();

    return () => {
      isCancelled = true;
    };
  }, [text, size, errorCorrectionLevel, bgColor, fgColor]);

  // Handle Paste from Clipboard
  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        showToast('URL pasted from clipboard.', 'info');
      }
    } catch {
      showToast('Clipboard access denied. Please type or paste manually.', 'error');
    }
  };

  // Handle Download PNG
  const handleDownloadPng = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, 'qrcode_mergeall.png');
        confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
        showToast('QR Code downloaded successfully (PNG)!', 'success');
      }
    }, 'image/png');
  };

  // Handle Download SVG
  const handleDownloadSvg = async () => {
    try {
      const svgString = await generateQrSvgWithWatermark(text || 'https://', {
        size,
        errorCorrectionLevel,
        margin: 2,
        fgColor,
        bgColor,
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, 'qrcode_mergeall.svg');
      confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
      showToast('Vector QR Code downloaded successfully (SVG)!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export SVG format.', 'error');
    }
  };

  // Handle Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setIsCopied(true);
          confetti({ particleCount: 45, spread: 50, origin: { y: 0.6 } });
          showToast('QR code copied to clipboard!', 'success');
          setTimeout(() => setIsCopied(false), 2500);
        } catch {
          showToast('Direct image copy not supported in this browser.', 'error');
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('Failed to copy QR code image.', 'error');
    }
  };

  return (
    <div className="tool-card">
      <div className="tool-header">
        <h2 className="tool-title">URL to QR Code Generator</h2>
        <p className="tool-description">
          Generate clean, scannable QR codes from links or text. Includes an automatic bottom-center &ldquo;mergeall&rdquo; watermark.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Input & Customization Controls */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Input Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="qr-url-input" className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                Target URL or Text
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="btn-pill flex items-center gap-1 text-xs"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3 h-3" /> Paste
                </button>
                {text && (
                  <button
                    type="button"
                    onClick={() => setText('')}
                    className="btn-pill flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
                    title="Clear text"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                id="qr-url-input"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter URL (e.g. https://example.com) or any custom text..."
                className="input-text w-full text-sm font-mono resize-none"
              />
            </div>

            {/* Quick Prefix Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-medium text-slate-400">Quick prefix:</span>
              {['https://', 'http://', 'mailto:', 'tel:'].map((prefix) => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => {
                    if (!text.startsWith(prefix)) {
                      setText(`${prefix}${text.replace(/^(https?:\/\/|mailto:|tel:)/, '')}`);
                    }
                  }}
                  className="px-2 py-0.5 rounded text-[11px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                >
                  {prefix}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Palette: Default White + 12 selectable options */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                Background Color (12 Options)
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase">{bgColor}</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
              {BG_COLOR_OPTIONS.map((c) => {
                const isSelected = bgColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBgColor(c.hex)}
                    title={`${c.name} (${c.hex})`}
                    className={`h-9 rounded-md border flex items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 ring-offset-1 border-indigo-600 shadow-sm'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-slate-800 drop-shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Background Color Picker */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                title="Choose custom background color"
              />
              <span className="text-xs text-slate-500">Or pick custom background color</span>
            </div>
          </div>

          {/* Foreground & Configuration Settings */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                QR Styling & Output
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Foreground Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-700">QR Code Color</label>
                <div className="flex items-center gap-1.5">
                  {FG_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFgColor(c.hex)}
                      title={c.name}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        fgColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-indigo-600 ring-offset-1 scale-110'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 cursor-pointer ml-1"
                    title="Choose custom QR color"
                  />
                </div>
              </div>

              {/* Output Resolution */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-700">Resolution Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="input-select-sm"
                >
                  <option value={320}>Standard (320 × 320 px)</option>
                  <option value={512}>High Definition (512 × 512 px)</option>
                  <option value={1024}>Ultra Print (1024 × 1024 px)</option>
                </select>
              </div>

              {/* Error Correction Level */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700">Error Correction Level</label>
                  <span className="text-[11px] text-slate-400">
                    {errorCorrectionLevel === 'L' ? '7% recovery' : errorCorrectionLevel === 'M' ? '15% recovery (Balanced)' : errorCorrectionLevel === 'Q' ? '25% recovery' : '30% recovery (Maximum)'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'L', name: 'Low (7%)' },
                    { id: 'M', name: 'Medium (15%)' },
                    { id: 'Q', name: 'Quartile (25%)' },
                    { id: 'H', name: 'High (30%)' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setErrorCorrectionLevel(lvl.id)}
                      className={`py-1.5 px-2 rounded border text-xs font-medium text-center transition-all cursor-pointer ${
                        errorCorrectionLevel === lvl.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live QR Preview & Export Actions */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-6 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center min-h-[380px] relative">
            {/* Watermark Notice Badge */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-slate-500 pointer-events-none">
              <span className="font-semibold text-slate-700">Preview</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600 shadow-2xs">
                Watermark: <strong className="font-semibold text-slate-800">mergeall</strong> (12px)
              </span>
            </div>

            {/* QR Canvas Display */}
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 max-w-full overflow-hidden mt-6">
              <canvas
                ref={canvasRef}
                className="max-w-[260px] max-h-[300px] sm:max-w-[280px] h-auto block rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <p className="text-xs text-slate-500 mt-3 text-center truncate max-w-[280px]">
              {text || 'Enter a URL to generate QR code'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isGenerating || !text}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PNG
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={isGenerating || !text}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download SVG
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isGenerating || !text}
              className="btn-secondary flex items-center justify-center gap-2 w-full"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
