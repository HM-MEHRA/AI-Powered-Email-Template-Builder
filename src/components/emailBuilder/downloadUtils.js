export const sanitizeFileName = (value, fallback = "email-template") => {
  const cleaned = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
};

export const downloadBlob = ({ blob, fileName }) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return objectUrl;
};

export const openPreviewPage = ({ title = "" } = {}) => {
  if (typeof window === "undefined") return null;

  const previewUrl = new URL("/preview.html", window.location.origin);
  previewUrl.searchParams.set("previewId", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  if (title) {
    previewUrl.searchParams.set("title", title);
  }

  const previewTarget = `email-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return window.open(previewUrl.toString(), previewTarget);
};

export const sendHtmlToPreviewPage = (previewWindow, html) => {
  if (!previewWindow || !html || typeof window === "undefined") return;

  const payload = {
    type: "EMAIL_BUILDER_PREVIEW_HTML",
    html,
  };
  const targetOrigin = window.location.origin;
  let attempts = 0;
  let intervalId = null;

  const cleanup = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    window.removeEventListener("message", handlePreviewReady);
  };

  const handlePreviewReady = (event) => {
    if (event.origin !== targetOrigin) return;
    if (event.source !== previewWindow) return;
    if (!event.data || event.data.type !== "EMAIL_BUILDER_PREVIEW_READY") return;
    cleanup();
  };

  const send = () => {
    if (!previewWindow || previewWindow.closed) {
      cleanup();
      return;
    }
    previewWindow.postMessage(payload, targetOrigin);
  };

  window.addEventListener("message", handlePreviewReady);
  send();
  intervalId = window.setInterval(() => {
    attempts += 1;
    send();
    if (attempts >= 20 || previewWindow.closed) {
      cleanup();
    }
  }, 150);
};
