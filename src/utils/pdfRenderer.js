import * as pdfjsLib from 'pdfjs-dist';

// Set up worker source
if (typeof window !== 'undefined') {
  // Use unpkg CDN matching pdfjs-dist version for rock solid cross-browser compatibility
  const version = pdfjsLib.version || '4.0.379';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

/**
 * Load PDF document from File object
 */
export async function getPdfDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * Render a single page of PDF to Canvas and return Data URL thumbnail
 */
export async function renderPdfPageToDataUrl(pdfDoc, pageNum, scale = 0.5) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  return {
    pageNum,
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    aspectRatio: viewport.width / viewport.height
  };
}

/**
 * Render all page thumbnails for a given PDF file
 */
export async function getPdfPageThumbnails(file, scale = 0.4, onProgress) {
  const pdfDoc = await getPdfDocument(file);
  const numPages = pdfDoc.numPages;
  const thumbnails = [];

  for (let i = 1; i <= numPages; i++) {
    const thumb = await renderPdfPageToDataUrl(pdfDoc, i, scale);
    thumbnails.push(thumb);

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return { numPages, thumbnails };
}

/**
 * Render PDF pages to high-resolution Blobs for downloading as images
 */
export async function renderPdfPagesToImages(file, scale = 2.0, format = 'png', onProgress) {
  const pdfDoc = await getPdfDocument(file);
  const numPages = pdfDoc.numPages;
  const pageImages = [];

  const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const extension = format === 'jpeg' || format === 'jpg' ? 'jpg' : format;

  const baseFileName = file.name.replace(/\.[^/.]+$/, '');

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Fill white background for JPEG exports to prevent black transparent background
    if (mimeType === 'image/jpeg') {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    
    // Convert canvas to Blob asynchronously
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.92));

    pageImages.push({
      pageNum: i,
      dataUrl,
      blob,
      filename: `${baseFileName}_page_${i}.${extension}`,
      width: viewport.width,
      height: viewport.height
    });

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return pageImages;
}
