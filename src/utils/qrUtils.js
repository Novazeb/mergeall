import QRCode from 'qrcode';

/**
 * 12 Background color options (with white as default)
 */
export const BG_COLOR_OPTIONS = [
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'slate', name: 'Slate Light', hex: '#f8fafc' },
  { id: 'gray', name: 'Soft Gray', hex: '#f1f5f9' },
  { id: 'cream', name: 'Cream', hex: '#fefce8' },
  { id: 'sky', name: 'Sky Blue', hex: '#eff6ff' },
  { id: 'indigo', name: 'Soft Indigo', hex: '#eef2ff' },
  { id: 'violet', name: 'Soft Violet', hex: '#f5f3ff' },
  { id: 'rose', name: 'Blush Rose', hex: '#fff1f2' },
  { id: 'emerald', name: 'Soft Emerald', hex: '#ecfdf5' },
  { id: 'amber', name: 'Warm Amber', hex: '#fffbeb' },
  { id: 'cyan', name: 'Pale Cyan', hex: '#ecfeff' },
  { id: 'peach', name: 'Soft Peach', hex: '#fff7ed' },
];

/**
 * Foreground color presets
 */
export const FG_COLOR_OPTIONS = [
  { id: 'slate-dark', name: 'Charcoal', hex: '#0f172a' },
  { id: 'indigo-dark', name: 'Deep Indigo', hex: '#3730a3' },
  { id: 'emerald-dark', name: 'Forest Green', hex: '#065f46' },
  { id: 'blue-dark', name: 'Navy Blue', hex: '#1e40af' },
  { id: 'violet-dark', name: 'Deep Violet', hex: '#5b21b6' },
  { id: 'rose-dark', name: 'Ruby Crimson', hex: '#9f1239' },
];

/**
 * Determine suitable watermark text color based on background luminance
 */
function getWatermarkColor(bgHex) {
  // Convert hex to rgb
  const cleanHex = bgHex.replace('#', '');
  if (cleanHex.length !== 6) return '#64748b';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#64748b' : '#cbd5e1';
}

/**
 * Generates a Canvas element containing the QR code and a small "mergeall" watermark at the bottom center.
 */
export async function generateQrCanvasWithWatermark(text, options = {}) {
  const {
    size = 320,
    errorCorrectionLevel = 'M',
    margin = 2,
    fgColor = '#0f172a',
    bgColor = '#ffffff',
  } = options;

  // 1. Generate clean QR code on an offscreen canvas
  const tempCanvas = document.createElement('canvas');
  await QRCode.toCanvas(tempCanvas, text || ' ', {
    width: size,
    margin,
    errorCorrectionLevel,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });

  // 2. Compute watermark zone
  // Base font size is 12px for standard resolution (320px), scaled proportionally for high-res outputs
  const scale = size / 320;
  const fontSize = Math.max(12, Math.round(12 * scale));
  const watermarkHeight = Math.max(26, Math.round(26 * scale));

  // 3. Create final canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = size;
  finalCanvas.height = size + watermarkHeight;

  const ctx = finalCanvas.getContext('2d');

  // Fill entire background (QR + watermark area)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

  // Draw QR code
  ctx.drawImage(tempCanvas, 0, 0);

  // Draw "mergeall" watermark at bottom center
  const watermarkColor = getWatermarkColor(bgColor);
  ctx.fillStyle = watermarkColor;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Center horizontally and position vertically in the bottom padding
  const textX = finalCanvas.width / 2;
  const textY = size + (watermarkHeight / 2) - Math.round(2 * scale);
  ctx.fillText('mergeall', textX, textY);

  return finalCanvas;
}

/**
 * Generates an SVG string containing the QR code and the "mergeall" watermark.
 */
export async function generateQrSvgWithWatermark(text, options = {}) {
  const {
    size = 320,
    errorCorrectionLevel = 'M',
    margin = 2,
    fgColor = '#0f172a',
    bgColor = '#ffffff',
  } = options;

  const rawSvg = await QRCode.toString(text || ' ', {
    type: 'svg',
    width: size,
    margin,
    errorCorrectionLevel,
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });

  const scale = size / 320;
  const fontSize = Math.max(12, Math.round(12 * scale));
  const watermarkHeight = Math.max(26, Math.round(26 * scale));
  const totalHeight = size + watermarkHeight;
  const watermarkColor = getWatermarkColor(bgColor);
  const textY = size + (watermarkHeight / 2) + Math.round(2 * scale);

  // Replace svg height and viewBox with extended height to accommodate bottom watermark
  const modifiedSvg = rawSvg
    .replace(/viewBox="([^"]+)"/, `viewBox="0 0 ${size} ${totalHeight}"`)
    .replace(/width="[^"]+"/, `width="${size}"`)
    .replace(/height="[^"]+"/, `height="${totalHeight}"`)
    .replace(
      '</svg>',
      `<rect x="0" y="${size}" width="${size}" height="${watermarkHeight}" fill="${bgColor}" />
<text x="50%" y="${textY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="600" fill="${watermarkColor}">mergeall</text>
</svg>`
    );

  return modifiedSvg;
}
