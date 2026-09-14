# mergeall

<h3 align="center">Client-Side PDF and Image Utility Application</h3>

<p align="center">
  A high-performance, privacy-focused web application for processing PDF documents and image files.<br/>
  All operations are executed entirely within the client's web browser without remote server dependencies.
</p>

<p align="center">
  <a href="https://github.com/Novazeb/mergeall/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Environment-Browser%20Client-informational" alt="Environment: Browser Client" />
  <img src="https://img.shields.io/badge/Security-Zero%20Server%20Uploads-success" alt="Security: Zero Server Uploads" />
</p>

---

## Overview

Modern web workflows frequently require manipulating sensitive documents, such as financial records, identification cards, and personal files. Conventional web utilities often transmit these files to third-party servers for processing, introducing potential security and compliance concerns.

**mergeall** provides an entirely client-side alternative. By leveraging modern browser capabilities, WebAssembly, and native JavaScript APIs, document transformations occur strictly within local memory. No files, metadata, or telemetry are uploaded to external systems.

---

## Functional Modules

The application provides nine dedicated utilities grouped into organization, conversion, optimization, and security domains:

| Module | Technical Functionality |
| :--- | :--- |
| **Merge PDF** | Concatenates multiple PDF documents into a single document with customizable sequencing. |
| **Split and Extract** | Segregates document pages by custom ranges or decomposes a PDF into individual single-page files, available for download individually or packaged as a ZIP archive. |
| **Organize and Rotate** | Enables page reordering, selective or uniform angular rotations (90, 180, and 270 degrees), and page deletions. |
| **Scan Document** | Processes camera captures or raster inputs through document boundary detection, perspective alignment, grayscale or binary thresholding filters, and brightness or contrast adjustments. |
| **Image to PDF** | Compiles raster image formats (JPEG, PNG, WebP) into formatted PDF documents with configurable dimensions, orientation, and margin settings. |
| **PDF to Image** | Renders vector PDF pages into high-resolution raster images (JPEG, PNG) with custom resolution scaling. |
| **Compress Image** | Downsamples and compresses image files using iterative quality thresholds while maintaining visual integrity. |
| **Compress PDF** | Optimizes PDF document structures and downscales embedded bitmap assets directly within client runtime. |
| **Protect PDF** | Encrypts PDF documents with user credentials using client-side cryptographic implementations. |

---

## Privacy and Security Architecture

The architectural foundation of mergeall adheres to the principle of zero data persistence:

- **Local Execution**: Document parsing, manipulation, and rendering run strictly within browser process memory.
- **Zero Remote Transmission**: No HTTP payloads containing user documents or derived metadata are generated or transmitted.
- **Stateless Operation**: Memory allocations associated with document buffers are discarded upon session completion or navigation away from the application.
- **Offline Capability**: Following initial asset caching, core document processing features execute without an active internet connection.

---

## Technology Stack

### Core Framework and Build Tooling
- **Runtime Environment**: Modern Web Browsers (ECMAScript 2022+)
- **Application Framework**: React 19
- **Build System**: Vite 8
- **Code Quality**: Oxlint

### Processing Libraries
- **PDF Manipulation and Parsing**: `pdf-lib`, `pdfjs-dist`
- **Client-Side Cryptography**: `@pdfsmaller/pdf-encrypt-lite`
- **Image Compression**: `browser-image-compression`
- **Archive Generation and File I/O**: `jszip`, `file-saver`
- **Component Interface Icons**: `lucide-react`

---

## Local Development and Setup

### System Prerequisites
- Node.js version 18.0.0 or higher
- npm version 9.0.0 or higher

### Installation

1. Clone the source repository:
   ```bash
   git clone https://github.com/Novazeb/mergeall.git
   cd mergeall
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Initialize the development environment:
   ```bash
   npm run dev
   ```

4. Access the application at `http://localhost:5173`.

---

## Production Build and Deployment

To produce a production-ready static distribution:

```bash
npm run build
```

Compiled assets will be written to the `dist/` directory.

### Static Hosting

The resulting artifacts are fully static and compatible with any standard static web hosting provider (such as Netlify, Vercel, Cloudflare Pages, or Amazon S3):

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Routing Configuration**: Standard Single-Page Application (SPA) rewrite rules apply. A pre-configured `netlify.toml` file is included in the project root.

---

## Repository Structure

```text
mergeall/
├── public/              # Static public assets
├── src/
│   ├── assets/          # Global styles and static resources
│   ├── components/      # Reusable presentation and layout components
│   ├── context/         # React context providers for state management
│   ├── tools/           # Isolated processing tools and domain logic
│   │   ├── CompressImageTool.jsx
│   │   ├── CompressPdfTool.jsx
│   │   ├── ImageToPdfTool.jsx
│   │   ├── MergePdfTool.jsx
│   │   ├── OrganizePdfTool.jsx
│   │   ├── PdfToImageTool.jsx
│   │   ├── ProtectPdfTool.jsx
│   │   ├── ScanDocumentTool.jsx
│   │   └── SplitPdfTool.jsx
│   ├── utils/           # Shared utility functions (PDF engine, image processing)
│   ├── App.jsx          # Primary layout and tool navigation router
│   └── main.jsx         # Application entry point
├── netlify.toml         # Deployment routing configuration
├── package.json         # Project manifests and dependency specifications
└── vite.config.js       # Vite build configuration
```

---

## Contribution Guidelines

Contributions that align with the privacy-first, client-side objectives of this project are welcome.

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/proposed-enhancement
   ```
3. Commit modifications with descriptive commit messages:
   ```bash
   git commit -m "feat: add implementation detail"
   ```
4. Push the branch to your fork:
   ```bash
   git push origin feature/proposed-enhancement
   ```
5. Submit a Pull Request with a clear description of the modifications and test verifications.

---

## License
This project is licensed under the terms of the MIT License. Refer to the `LICENSE` file for full terms and conditions.

This project is licensed under the terms of the MIT License. Refer to the `LICENSE` file for full terms and conditions.
