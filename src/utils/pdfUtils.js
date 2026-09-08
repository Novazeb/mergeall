import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { getPdfDocument } from './pdfRenderer.js';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';

/**
 * Merge multiple PDF files into one PDF
 */
export async function mergePdfs(files, onProgress) {
  const mergedPdf = await PDFDocument.create();
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const pageIndices = pdfDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
    
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Extract selected pages from a PDF into a single PDF
 */
export async function extractPdfPages(pdfFile, pageNumbers, onProgress) {
  const bytes = await pdfFile.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();

  // Convert 1-indexed pageNumbers to 0-indexed indices
  const pageIndices = pageNumbers.map(n => n - 1).filter(idx => idx >= 0 && idx < srcPdf.getPageCount());

  const total = pageIndices.length;
  for (let i = 0; i < total; i++) {
    const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIndices[i]]);
    newPdf.addPage(copiedPage);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Split selected pages into individual single-page PDF files bundled in a ZIP archive
 */
export async function splitPdfToZip(pdfFile, pageNumbers, onProgress) {
  const bytes = await pdfFile.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes);
  const zip = new JSZip();
  const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');

  const total = pageNumbers.length;
  for (let i = 0; i < total; i++) {
    const pageNum = pageNumbers[i];
    const pageIndex = pageNum - 1;
    
    if (pageIndex >= 0 && pageIndex < srcPdf.getPageCount()) {
      const singlePdf = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(srcPdf, [pageIndex]);
      singlePdf.addPage(copiedPage);
      
      const singleBytes = await singlePdf.save();
      zip.file(`${baseName}_page_${pageNum}.pdf`, singleBytes);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 80)); // Leave 20% for zip generation
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(80 + Math.round(metadata.percent * 0.2));
    }
  });

  return zipBlob;
}

/**
 * Convert an array of Image files into a single PDF document
 * Options:
 * - pageSize: 'A4' | 'Letter' | 'Fit'
 * - orientation: 'portrait' | 'landscape' | 'auto'
 * - margin: 0 | 10 | 20 (in points/mm)
 */
export async function imagesToPdf(imageFiles, options = {}, onProgress) {
  const {
    pageSize = 'A4',
    orientation = 'portrait',
    margin = 10
  } = options;

  const pdfDoc = await PDFDocument.create();
  const total = imageFiles.length;

  for (let i = 0; i < total; i++) {
    const imageFile = imageFiles[i];
    const imageBytes = await imageFile.arrayBuffer();
    
    let image;
    const type = imageFile.type.toLowerCase();
    
    if (type.includes('png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else if (type.includes('jpeg') || type.includes('jpg')) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else {
      // Convert other formats (e.g. WebP) to JPEG via Canvas first
      const jpegBlob = await convertImageToJpegBlob(imageFile);
      const jpegBytes = await jpegBlob.arrayBuffer();
      image = await pdfDoc.embedJpg(jpegBytes);
    }

    const imgWidth = image.width;
    const imgHeight = image.height;

    let pageWidth, pageHeight;

    if (pageSize === 'Fit') {
      pageWidth = imgWidth + margin * 2;
      pageHeight = imgHeight + margin * 2;
    } else {
      const standardDimensions = pageSize === 'Letter' ? PageSizes.Letter : PageSizes.A4;
      let [w, h] = standardDimensions;

      let isLandscape = orientation === 'landscape';
      if (orientation === 'auto') {
        isLandscape = imgWidth > imgHeight;
      }

      pageWidth = isLandscape ? Math.max(w, h) : Math.min(w, h);
      pageHeight = isLandscape ? Math.min(w, h) : Math.max(w, h);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate maximum image size within margins
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    // Center image on page
    const x = margin + (availableWidth - drawWidth) / 2;
    const y = margin + (availableHeight - drawHeight) / 2;

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Helper to convert any image file (like WebP or SVG) to a JPEG Blob using HTML Canvas
 */
function convertImageToJpegBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob);
        else reject(new Error('Canvas conversion failed'));
      }, 'image/jpeg', 0.92);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Reorder, rotate, and delete pages of a PDF
 * pagesConfig: Array<{ originalIndex: number, rotation: number }>
 */
export async function organizePdf(pdfFile, pagesConfig, onProgress) {
  const bytes = await pdfFile.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();

  const total = pagesConfig.length;
  for (let i = 0; i < total; i++) {
    const { originalIndex, rotation = 0 } = pagesConfig[i];
    const [copiedPage] = await newPdf.copyPages(srcPdf, [originalIndex]);
    if (rotation !== 0) {
      const currentAngle = copiedPage.getRotation()?.angle || 0;
      copiedPage.setRotation(degrees(((currentAngle + rotation) % 360 + 360) % 360));
    }
    newPdf.addPage(copiedPage);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Optimize digital vector PDF by cleaning unreferenced streams while preserving 100% crisp vector text
 */
export async function optimizeVectorPdf(pdfFile, onProgress) {
  if (onProgress) onProgress(20);
  const bytes = await pdfFile.arrayBuffer();
  if (onProgress) onProgress(50);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (onProgress) onProgress(80);
  const optimizedBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);
  return new Blob([optimizedBytes], { type: 'application/pdf' });
}

/**
 * Compress a PDF by re-encoding pages with canvas at chosen scale & quality
 */
export async function compressPdf(pdfFile, preset = 'recommended', onProgress) {
  const configs = {
    extreme: { scale: 0.9, quality: 0.50 },
    recommended: { scale: 1.25, quality: 0.70 },
    light: { scale: 1.6, quality: 0.85 }
  };
  const { scale, quality } = configs[preset] || configs.recommended;

  const pdfDoc = await getPdfDocument(pdfFile);
  const numPages = pdfDoc.numPages;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Canvas conversion failed on page ${i}`));
      }, 'image/jpeg', quality);
    });
    const jpegBytes = await jpegBlob.arrayBuffer();
    const embeddedImg = await newPdf.embedJpg(jpegBytes);

    const originalViewport = page.getViewport({ scale: 1.0 });
    const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: originalViewport.width,
      height: originalViewport.height,
    });

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Protect a PDF document with password encryption
 */
export async function protectPdf(pdfFile, userPassword, ownerPassword = '', onProgress) {
  if (onProgress) onProgress(15);
  const bytes = await pdfFile.arrayBuffer();
  if (onProgress) onProgress(45);

  const uint8Bytes = new Uint8Array(bytes);
  const encryptedBytes = await encryptPDF(
    uint8Bytes,
    userPassword,
    ownerPassword || userPassword
  );

  if (onProgress) onProgress(100);
  return new Blob([encryptedBytes], { type: 'application/pdf' });
}
