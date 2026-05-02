export const stripAttachmentNotes = (value = "") =>
  String(value || "")
    .replace(/^\s*\[(?:image|img|photo|picture|file|attachment|document|pdf)\s*:\s*[^\]]+\]\s*$/gim, "")
    .replace(/\s*\[(?:image|img|photo|picture|file|attachment|document|pdf)\s*:\s*[^\]]+\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const buildTemplateText = (template) =>
  [
    `Subject: ${template.subject}`,
    "",
    stripAttachmentNotes(template.greeting),
    "",
    stripAttachmentNotes(template.body),
    "",
    stripAttachmentNotes(template.closing),
    stripAttachmentNotes(template.signature),
  ].join("\n");

export const buildEmailBody = (template) =>
  [
    stripAttachmentNotes(template.greeting),
    "",
    stripAttachmentNotes(template.body),
    "",
    stripAttachmentNotes(template.closing),
    stripAttachmentNotes(template.signature),
  ].join("\n");

export const sanitizeFileName = (value, fallback = "email-template") => {
  const cleaned = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
};

export const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
