import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { getPdfDocument, renderPdfPageToDataUrl } from './pdfRenderer';

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
