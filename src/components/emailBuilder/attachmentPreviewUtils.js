import { escapeHtml } from "./templateTextUtils";

export const getAttachmentExtension = (file) => {
  const parts = (file?.name || "").split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
};

const isImageAttachment = (file) => Boolean(file?.type?.startsWith("image/"));

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsText(file);
  });

const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });

const decodeArrayBuffer = (buffer) => new TextDecoder("latin1").decode(new Uint8Array(buffer));

const extractDocxPageCount = (text) => {
  const match = text.match(/<Pages>(\d+)<\/Pages>/i);
  return match ? Number(match[1]) : 0;
};

const createFileObjectUrl = (file) => URL.createObjectURL(file);

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const renderPdfFirstPageImage = async (file) => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdfjsModule = await import("pdfjs-dist/webpack");
  const pdfjsLib = pdfjsModule.default || pdfjsModule;
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 920 / baseViewport.width);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  pdf.cleanup();
  return canvas.toDataURL("image/png");
};

const addPdfFirstPageParams = (src = "") =>
  src ? `${src}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0` : "";

export const buildAttachmentPreviewMarkup = (attachmentDetails) => {
  if (!attachmentDetails?.showPreview) {
    return "";
  }

  if (attachmentDetails.imageSrc) {
    return `<section class="attachment-block">
        <p class="attachment-kicker">Attached image</p>
        <figure class="attachment-preview attachment-image">
          <img src="${escapeHtml(attachmentDetails.imageSrc)}" alt="Attached image preview" />
        </figure>
      </section>`;
  }

  if (attachmentDetails.pdfImageSrc) {
    return `<section class="attachment-block">
        <p class="attachment-kicker">Attached PDF - first page</p>
        <figure class="attachment-preview attachment-pdf-page">
          <img src="${escapeHtml(attachmentDetails.pdfImageSrc)}" alt="${escapeHtml(attachmentDetails.name || "PDF first page preview")}" />
        </figure>
        <p class="attachment-pdf__fallback">
          <a href="${escapeHtml(attachmentDetails.pdfSrc || attachmentDetails.pdfImageSrc)}" target="_blank" rel="noopener noreferrer">Open PDF in a new tab</a>
        </p>
      </section>`;
  }

  if (attachmentDetails.pdfSrc) {
    const pdfPreviewSrc = addPdfFirstPageParams(attachmentDetails.pdfSrc);
    return `<section class="attachment-block">
        <p class="attachment-kicker">Attached PDF - first page</p>
        <div class="attachment-preview attachment-embed attachment-pdf">
          <iframe src="${escapeHtml(pdfPreviewSrc)}" title="PDF preview" class="attachment-embed__frame" loading="eager"></iframe>
        </div>
        <p class="attachment-pdf__fallback">
          <a href="${escapeHtml(attachmentDetails.pdfSrc)}" target="_blank" rel="noopener noreferrer">Open PDF in a new tab</a>
        </p>
      </section>`;
  }

  return `<section class="attachment-block">
      <p class="attachment-kicker">Attached document - first page</p>
      <div class="attachment-preview attachment-paper">
        <div class="attachment-paper__sheet">
          <div class="attachment-paper__topline"></div>
          <p class="attachment-paper__label">${escapeHtml(attachmentDetails.kind || "FILE")}</p>
          <h3 class="attachment-paper__title">${escapeHtml(attachmentDetails.title || "Document preview")}</h3>
          ${
            attachmentDetails.previewText
              ? `<pre class="attachment-paper__text">${escapeHtml(attachmentDetails.previewText)}</pre>`
              : `<div class="attachment-paper__lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span class="short"></span>
            </div>`
          }
        </div>
      </div>
      </section>`;
};

export const analyzeAttachmentForPreview = async (file) => {
  if (!file) {
    return { name: "", showPreview: false };
  }

  const extension = getAttachmentExtension(file);
  const details = {
    name: file.name || "",
    kind: extension,
    sizeLabel: formatFileSize(file.size),
    showPreview: false,
  };

  if (isImageAttachment(file)) {
    return {
      ...details,
      showPreview: true,
      imageSrc: await readFileAsDataUrl(file),
    };
  }

  if (extension === "TXT") {
    const text = await readFileAsText(file);
    return {
      ...details,
      showPreview: true,
      title: "Text document preview",
      previewText: text.trim().slice(0, 1400),
    };
  }

  if (extension === "PDF") {
    const pdfSrc = createFileObjectUrl(file);
    let pdfImageSrc = "";
    try {
      pdfImageSrc = await renderPdfFirstPageImage(file);
    } catch (pdfPreviewError) {
      console.error("PDF first-page preview failed", pdfPreviewError);
    }

    return {
      ...details,
      showPreview: true,
      pdfSrc,
      pdfImageSrc,
    };
  }

  if (extension === "DOCX") {
    const buffer = await readFileAsArrayBuffer(file);
    const decoded = decodeArrayBuffer(buffer);
    const pageCount = extractDocxPageCount(decoded);
    return {
      ...details,
      showPreview: true,
      title: pageCount > 1 ? "First page preview" : "Document preview",
    };
  }

  return {
    ...details,
    showPreview: true,
    title: "Document preview",
  };
};
