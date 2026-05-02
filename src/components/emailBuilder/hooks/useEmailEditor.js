import { createSavedTemplate, isAuthenticated } from "../../../services/ai";
import {
  applyRewriteAction,
  buildStoredTemplatePayload,
  cleanTemplateForDisplay,
  cloneTemplate,
  createSectionVariant,
  inferToneMode,
  openGmailCompose,
  openMailClient,
  parseToneList,
} from "../builderUtils";
import {
  analyzeAttachmentForPreview,
  buildTemplatePreviewHtml,
  buildTemplateText,
  downloadBlob,
  openPreviewPage,
  sanitizeFileName,
  sendHtmlToPreviewPage,
} from "../previewUtils";

const useEmailEditor = ({
  attachment,
  editableTemplate,
  previewFont,
  previewSpacing,
  previewTheme,
  refreshSavedTemplates,
  setEditableTemplate,
  setError,
  setForm,
  setGenerateStep,
  setSelectedTemplate,
  setStatusMessage,
  setTemplates,
  navigateToTab,
}) => {
  const updateEditableTemplate = (key, value) => {
    setEditableTemplate((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSaveCustomTemplate = () => {
    if (!editableTemplate) return;
    if (!isAuthenticated()) {
      setError("Log in to save templates to your account.");
      return;
    }
    const persist = async () => {
      const savedTemplate = await createSavedTemplate({
        title: editableTemplate.subject || "Untitled email",
        content: JSON.stringify(buildStoredTemplatePayload(editableTemplate)),
        footer: editableTemplate.closing || "",
      });
      if (savedTemplate?.error) {
        setError(savedTemplate.error);
        return;
      }
      await refreshSavedTemplates();
      setStatusMessage("Saved to your account library.");
      navigateToTab("My Templates");
    };
    persist();
  };

  const handleRewrite = (action) => {
    if (!editableTemplate) return;
    setEditableTemplate((current) => applyRewriteAction(current, action));
    setStatusMessage(`Applied ${action} rewrite.`);
  };

  const handleRegenerateSection = (section) => {
    if (!editableTemplate) return;
    setEditableTemplate((current) => createSectionVariant(current, section));
    setStatusMessage(`${section} refreshed.`);
  };

  const buildAttachmentDetails = async () => {
    let attachmentDetails = { name: attachment?.name || "", showPreview: false };
    if (attachment) {
      try {
        attachmentDetails = await analyzeAttachmentForPreview(attachment);
      } catch (previewError) {
        console.error("Attachment preview failed", previewError);
      }
    }
    return attachmentDetails;
  };

  const handlePreviewTemplate = async (template) => {
    const previewWindow = openPreviewPage({ title: template.subject || "Email Preview" });
    if (!previewWindow) {
      setError("Preview was blocked by the browser. Allow popups for this site and try again.");
      return;
    }

    const attachmentDetails = await buildAttachmentDetails();
    const html = buildTemplatePreviewHtml(template, attachmentDetails, {
      ...previewTheme,
      font: previewFont,
      spacing: previewSpacing,
    });
    sendHtmlToPreviewPage(previewWindow, html);
    setStatusMessage("Preview opened in a new page.");
  };

  const handleApplyTemplate = (template) => {
    const chosenTemplate = cloneTemplate(template);
    setSelectedTemplate(chosenTemplate);
    setEditableTemplate(chosenTemplate);
    setForm((current) => ({
      ...current,
      subject: chosenTemplate.subject,
    }));
    setGenerateStep("workspace");
    navigateToTab("Generate");
    setStatusMessage("Selected template loaded into the editor.");
  };

  const handleCopyTemplate = async (template) => {
    try {
      await navigator.clipboard.writeText(buildTemplateText(template));
      setStatusMessage(`${template.subject} copied`);
    } catch (copyError) {
      console.error("Copy failed", copyError);
      setError("Copy failed. Your browser may be blocking clipboard access.");
    }
  };

  const handleOpenMailTemplate = (template) => {
    openMailClient(template);
    setStatusMessage(`${template.subject} opened in your email app`);
  };

  const handleOpenGmailTemplate = (template) => {
    openGmailCompose(template);
    setStatusMessage(`${template.subject} opened in Gmail`);
  };

  const handleDownloadTemplate = async (template) => {
    const previewWindow = openPreviewPage({ title: template.subject || "Email Preview" });
    if (!previewWindow) {
      setError("Download preview was blocked by the browser. Allow popups for this site and try again.");
      return;
    }

    const attachmentDetails = await buildAttachmentDetails();
    const html = buildTemplatePreviewHtml(template, attachmentDetails, {
      ...previewTheme,
      font: previewFont,
      spacing: previewSpacing,
    });
    const baseName = sanitizeFileName(template.subject, "email-template");
    const htmlBlob = new Blob([html], { type: "text/html;charset=utf-8" });
    downloadBlob({
      blob: htmlBlob,
      fileName: `${baseName}.html`,
    });
    sendHtmlToPreviewPage(previewWindow, html);

    if (attachment) {
      downloadBlob({
        blob: attachment,
        fileName: attachment.name,
      });
      setStatusMessage(`${template.subject} and ${attachment.name} downloaded`);
      return;
    }

    setStatusMessage(`${template.subject} downloaded and opened in browser`);
  };

  const handleOpenHistoryItem = (item) => {
    const historyRunId = item.id || Date.now();
    const restoredTemplates = (item.variations || []).map((variation, index) => ({
      ...cleanTemplateForDisplay(variation, item.subject),
      id: variation?.id || `history-${historyRunId}-${index + 1}`,
    }));
    const chosenTemplate = restoredTemplates[0] ? cloneTemplate(restoredTemplates[0]) : null;

    setForm({
      subject: item.subject,
      purpose: item.purpose,
      tones: parseToneList(item.tone),
      toneMode: inferToneMode(item.tone),
    });
    setTemplates(restoredTemplates);
    setSelectedTemplate(chosenTemplate);
    setEditableTemplate(chosenTemplate);
    navigateToTab("Fresh Emails");
    setStatusMessage("Loaded fresh emails from history.");
  };

  return {
    handleApplyTemplate,
    handleCopyTemplate,
    handleDownloadTemplate,
    handleOpenGmailTemplate,
    handleOpenHistoryItem,
    handleOpenMailTemplate,
    handlePreviewTemplate,
    handleRegenerateSection,
    handleRewrite,
    handleSaveCustomTemplate,
    updateEditableTemplate,
  };
};

export default useEmailEditor;
