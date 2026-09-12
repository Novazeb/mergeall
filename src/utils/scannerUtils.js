/**
 * Utility functions for client-side document scanning, edge detection, and image enhancement filters
 */

/**
 * Calculates Otsu's optimal threshold between two luminance distributions in [startVal..endVal]
 */
function calculateOtsuThreshold(hist, startVal = 0, endVal = 255) {
  let total = 0;
  for (let t = startVal; t <= endVal; t++) total += hist[t];
  if (total === 0) return startVal;

  let sum = 0;
  for (let t = startVal; t <= endVal; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let varMax = 0;
  let threshold = startVal;

  for (let t = startVal; t <= endVal; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Automatically detects document paper boundaries by inspecting contrast gradients on a downsampled canvas.
 * Uses two-level Otsu thresholding and projection density to accurately locate paper edges on any background.
 * Returns normalized coordinates: { x: 0..1, y: 0..1, width: 0..1, height: 0..1 }
 */
export function detectDocumentBounds(imageElement) {
  const naturalWidth = imageElement.naturalWidth || imageElement.width || 800;
  const naturalHeight = imageElement.naturalHeight || imageElement.height || 600;

  // Downsample to a fast analysis resolution (~240px wide)
  const sampleWidth = 240;
  const sampleHeight = Math.max(120, Math.round((sampleWidth / naturalWidth) * naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);

  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;
  const totalPixels = sampleWidth * sampleHeight;

  // 1. Grayscale luminance array & histogram
  const gray = new Uint8Array(totalPixels);
  const hist = new Int32Array(256);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    // Standard perceptual luminance formula
    const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    gray[i] = lum;
    hist[lum]++;
  }

  // 2. Pass 1 Otsu threshold
  const t1 = calculateOtsuThreshold(hist, 0, 255);

  // 3. Inspect corners (background sample)
  const cornerSize = Math.max(3, Math.floor(Math.min(sampleWidth, sampleHeight) * 0.05));
  let cornerSum = 0;
  let cornerCount = 0;

  for (let dy = 0; dy < cornerSize; dy++) {
    for (let dx = 0; dx < cornerSize; dx++) {
      cornerSum += gray[dy * sampleWidth + dx]; // top-left
      cornerSum += gray[dy * sampleWidth + (sampleWidth - 1 - dx)]; // top-right
      cornerSum += gray[(sampleHeight - 1 - dy) * sampleWidth + dx]; // bottom-left
      cornerSum += gray[(sampleHeight - 1 - dy) * sampleWidth + (sampleWidth - 1 - dx)]; // bottom-right
      cornerCount += 4;
    }
  }

  const cornerAvg = cornerSum / cornerCount;

  // 4. Refine threshold if image has 3 modes (e.g. dark text + medium desk + white paper)
  let effectiveThreshold = t1;
  if (cornerAvg > t1 + 20) {
    // Desk is medium-light (e.g. wood/marble), t1 caught the dark text. Refine between desk and paper.
    effectiveThreshold = calculateOtsuThreshold(hist, Math.min(250, Math.round(t1 + 8)), 255);
  } else if (cornerAvg < t1 - 25 && t1 > 80) {
    // Very dark background with dark elements
    effectiveThreshold = t1;
  }

  // Determine paper polarity: paper is typically brighter than surrounding surface
  const paperIsBright = cornerAvg <= effectiveThreshold;

  // 5. Calculate row paper pixel density
  const rowCounts = new Int32Array(sampleHeight);
  let totalPaperPixels = 0;

  for (let y = 0; y < sampleHeight; y++) {
    const rowOffset = y * sampleWidth;
    for (let x = 0; x < sampleWidth; x++) {
      const lum = gray[rowOffset + x];
      const isPaper = paperIsBright ? (lum > effectiveThreshold) : (lum <= effectiveThreshold);
      if (isPaper) {
        rowCounts[y]++;
        totalPaperPixels++;
      }
    }
  }

  // If paper covers > 94% of the total frame, it was already framed tightly
  if (totalPaperPixels > totalPixels * 0.94) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let maxRowDensity = 0;
  for (let y = 0; y < sampleHeight; y++) {
    if (rowCounts[y] > maxRowDensity) maxRowDensity = rowCounts[y];
  }

  // If paper was barely detected (< 15% of canvas width), fall back to comfortable central crop
  if (maxRowDensity < sampleWidth * 0.15) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }

  // 6. Find contiguous vertical bands where paper density is substantial (>= 35% of peak density)
  // This completely eliminates background glare/cloth shine and isolates the true document sheet.
  const minRowDensity = Math.max(Math.round(sampleWidth * 0.15), Math.round(maxRowDensity * 0.35));
  const yBands = [];
  let inBand = false;
  let startY = 0;
  let currentMass = 0;
  let gapCount = 0;

  for (let y = 0; y < sampleHeight; y++) {
    if (rowCounts[y] >= minRowDensity) {
      if (!inBand) {
        inBand = true;
        startY = y;
        currentMass = 0;
      }
      currentMass += rowCounts[y];
      gapCount = 0;
    } else {
      if (inBand) {
        gapCount++;
        // Bridge dark separator lines or tables <= 5 pixels wide
        if (gapCount > 5) {
          inBand = false;
          const endY = y - gapCount;
          yBands.push({ startY, endY, height: endY - startY + 1, mass: currentMass });
        } else {
          currentMass += rowCounts[y];
        }
      }
    }
  }
  if (inBand) {
    const endY = sampleHeight - 1 - gapCount;
    yBands.push({ startY, endY, height: endY - startY + 1, mass: currentMass });
  }

  if (yBands.length === 0) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }

  // Select dominant band by total paper pixel mass
  yBands.sort((a, b) => b.mass - a.mass);
  const bestY = yBands[0];

  // Refine Y edges outwards to catch the exact edge of the paper
  let finalMinY = bestY.startY;
  let finalMaxY = bestY.endY;
  const edgeDropThreshY = Math.max(3, Math.round(sampleWidth * 0.04));
  while (finalMinY > 0 && rowCounts[finalMinY - 1] > edgeDropThreshY) {
    finalMinY--;
  }
  while (finalMaxY < sampleHeight - 1 && rowCounts[finalMaxY + 1] > edgeDropThreshY) {
    finalMaxY++;
  }

  // 7. Calculate column counts strictly within the dominant paper Y-band
  const bandHeight = finalMaxY - finalMinY + 1;
  const colCounts = new Int32Array(sampleWidth);
  for (let y = finalMinY; y <= finalMaxY; y++) {
    const rowOffset = y * sampleWidth;
    for (let x = 0; x < sampleWidth; x++) {
      const lum = gray[rowOffset + x];
      const isPaper = paperIsBright ? (lum > effectiveThreshold) : (lum <= effectiveThreshold);
      if (isPaper) {
        colCounts[x]++;
      }
    }
  }

  let maxColDensity = 0;
  for (let x = 0; x < sampleWidth; x++) {
    if (colCounts[x] > maxColDensity) maxColDensity = colCounts[x];
  }

  const minColDensity = Math.max(Math.round(bandHeight * 0.15), Math.round(maxColDensity * 0.35));
  const xBands = [];
  let inXBand = false;
  let startX = 0;
  let currentMassX = 0;
  let gapCountX = 0;

  for (let x = 0; x < sampleWidth; x++) {
    if (colCounts[x] >= minColDensity) {
      if (!inXBand) {
        inXBand = true;
        startX = x;
        currentMassX = 0;
      }
      currentMassX += colCounts[x];
      gapCountX = 0;
    } else {
      if (inXBand) {
        gapCountX++;
        if (gapCountX > 5) {
          inXBand = false;
          const endX = x - gapCountX;
          xBands.push({ startX, endX, width: endX - startX + 1, mass: currentMassX });
        } else {
          currentMassX += colCounts[x];
        }
      }
    }
  }
  if (inXBand) {
    const endX = sampleWidth - 1 - gapCountX;
    xBands.push({ startX, endX, width: endX - startX + 1, mass: currentMassX });
  }

  if (xBands.length === 0) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }

  xBands.sort((a, b) => b.mass - a.mass);
  const bestX = xBands[0];

  let finalMinX = bestX.startX;
  let finalMaxX = bestX.endX;
  const edgeDropThreshX = Math.max(3, Math.round(bandHeight * 0.04));
  while (finalMinX > 0 && colCounts[finalMinX - 1] > edgeDropThreshX) {
    finalMinX--;
  }
  while (finalMaxX < sampleWidth - 1 && colCounts[finalMaxX + 1] > edgeDropThreshX) {
    finalMaxX++;
  }

  // Ensure sensible minimum box
  const detectedWidth = finalMaxX - finalMinX;
  const detectedHeight = finalMaxY - finalMinY;
  if (detectedWidth < sampleWidth * 0.20 || detectedHeight < sampleHeight * 0.20) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }

  return {
    x: Math.round((finalMinX / sampleWidth) * 1000) / 1000,
    y: Math.round((finalMinY / sampleHeight) * 1000) / 1000,
    width: Math.round(((finalMaxX - finalMinX) / sampleWidth) * 1000) / 1000,
    height: Math.round(((finalMaxY - finalMinY) / sampleHeight) * 1000) / 1000,
  };
}

/**
 * Rotates an image element by a specified angle (90, 180, 270 deg) onto a new Data URL
 */
export function rotateImageToDataUrl(imageElement, angleDeg = 90) {
  const origW = imageElement.naturalWidth || imageElement.width;
  const origH = imageElement.naturalHeight || imageElement.height;

  const is90or270 = angleDeg % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = is90or270 ? origH : origW;
  canvas.height = is90or270 ? origW : origH;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.drawImage(imageElement, -origW / 2, -origH / 2);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Crops the source image onto a new Canvas
 * cropBox: normalized { x, y, width, height }
 * rotation: optional rotation in degrees (0, 90, 180, 270)
 */
export function cropAndRotateImage(imageElement, cropBox, rotation = 0) {
  const origW = imageElement.naturalWidth || imageElement.width;
  const origH = imageElement.naturalHeight || imageElement.height;

  const sx = Math.max(0, Math.round(cropBox.x * origW));
  const sy = Math.max(0, Math.round(cropBox.y * origH));
  const sw = Math.min(origW - sx, Math.max(1, Math.round(cropBox.width * origW)));
  const sh = Math.min(origH - sy, Math.max(1, Math.round(cropBox.height * origH)));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.drawImage(imageElement, sx, sy, sw, sh, 0, 0, sw, sh);

  if (rotation % 360 === 0) {
    return cropCanvas;
  }

  // Rotated canvas
  const is90or270 = rotation % 180 !== 0;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = is90or270 ? sh : sw;
  outCanvas.height = is90or270 ? sw : sh;
  const outCtx = outCanvas.getContext('2d');

  outCtx.translate(outCanvas.width / 2, outCanvas.height / 2);
  outCtx.rotate((rotation * Math.PI) / 180);
  outCtx.drawImage(cropCanvas, -sw / 2, -sh / 2);

  return outCanvas;
}

/**
 * Applies scanner enhancements (Magic Color, B&W, Grayscale) and manual brightness/contrast
 * Returns a new Canvas
 */
export function applyScannerFilter(sourceCanvas, filterType = 'magic', options = {}) {
  const { brightness = 0, contrast = 0 } = options;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-calculate contrast factor: -50 to +50 mapped to factor
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = brightness * 1.5;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (filterType === 'magic') {
      // Magic Color: whiten gray paper shadows, deepen ink, preserve colored stamps & signatures
      let scale = 1.0;
      if (lum > 125) {
        // Whiten background paper and remove murky shadows smoothly
        const boost = Math.min(255, lum + (255 - lum) * 0.72);
        scale = boost / Math.max(1, lum);
      } else if (lum < 95) {
        // Deepen text ink for crisp reading
        scale = 0.76;
      } else {
        // Smooth linear transition between text and background
        const t = (lum - 95) / 30;
        scale = 0.76 + t * (1.0 - 0.76);
      }

      r = Math.min(255, Math.max(0, Math.round(r * scale)));
      g = Math.min(255, Math.max(0, Math.round(g * scale)));
      b = Math.min(255, Math.max(0, Math.round(b * scale)));

      // Slight saturation enhancement for colored stamps and signatures
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = maxC - minC;
      if (chroma > 22 && lum > 60 && lum < 210) {
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.25)));
        g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.25)));
        b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.25)));
      }
    } else if (filterType === 'bw') {
      // B&W Document: crisp high-contrast monochrome
      const thresh = 145;
      const val = (lum - thresh) * 7.5 + 128;
      const clamped = Math.min(255, Math.max(0, val));
      r = clamped;
      g = clamped;
      b = clamped;
    } else if (filterType === 'grayscale') {
      // Smooth grayscale with slight contrast stretch
      const stretch = Math.min(255, Math.max(0, (lum - 30) * (255 / 200)));
      r = stretch;
      g = stretch;
      b = stretch;
    }

    // Apply manual brightness and contrast
    if (brightness !== 0 || contrast !== 0) {
      r = contrastFactor * (r - 128) + 128 + brightnessOffset;
      g = contrastFactor * (g - 128) + 128 + brightnessOffset;
      b = contrastFactor * (b - 128) + 128 + brightnessOffset;
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Convert Canvas to Blob helper
 */
export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, mimeType, quality);
  });
}
