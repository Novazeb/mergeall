import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';

export default function Dropzone({
  onFilesSelected,
  accept = '*',
  multiple = true,
  title = 'Drag & Drop files here',
  subtitle = 'or click to browse from your computer',
  iconType = 'pdf'
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  return (
    <div
      className={`dropzone-container ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden-file-input"
      />

      <div className="dropzone-content">
        <div className="dropzone-icon-box">
          <UploadCloud className="dropzone-icon upload-icon" />
          {iconType === 'pdf' ? (
            <FileText className="dropzone-subicon text-slate-200" />
          ) : (
            <ImageIcon className="dropzone-subicon text-slate-200" />
          )}
        </div>

        <h3 className="dropzone-title">{title}</h3>
        <p className="dropzone-subtitle">{subtitle}</p>

        <button type="button" className="btn-browse-trigger">
          Select Files
        </button>

        <div className="dropzone-features">
          <span className="feature-pill">⚡ Fast Local Processing</span>
          <span className="feature-pill">🔒 Private & Secure</span>
        </div>
      </div>
    </div>
  );
}
