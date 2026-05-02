import { useCallback, useEffect, useState } from "react";
import {
  changePassword,
  exportAccountData,
  fetchAccountStats,
  fetchVerificationStatus,
  importAccountTemplates,
  requestPasswordReset,
} from "../../../services/ai";
import { downloadBlob, sanitizeFileName } from "../previewUtils";

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
};
const MAX_IMPORT_SIZE = 2 * 1024 * 1024;

const useAccountTools = ({ refreshSavedTemplates, setError, setStatusMessage }) => {
  const [accountStats, setAccountStats] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);

  const refreshAccountTools = useCallback(async () => {
    const [statsResult, verificationResult] = await Promise.all([
      fetchAccountStats(),
      fetchVerificationStatus(),
    ]);

    if (statsResult?.error) {
      setError(statsResult.error);
    } else {
      setAccountStats(statsResult);
    }

    if (verificationResult?.error) {
      setError(verificationResult.error);
    } else {
      setVerificationStatus(verificationResult);
    }
  }, [setError]);

  useEffect(() => {
    refreshAccountTools();
  }, [refreshAccountTools]);

  const handleExportAccountData = async () => {
    const result = await exportAccountData();
    if (result?.error) {
      setError(result.error);
      return;
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob({
      blob,
      fileName: `${sanitizeFileName(result?.user?.username || "inbox-studio")}-export.json`,
    });
    setStatusMessage("Account export downloaded.");
  };

  const handleImportTemplateFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Choose a JSON export file.");
      return;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      setError("Import files must be under 2 MB.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const templates = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(templates) || !templates.length) {
        setError("No templates found in that JSON file.");
        return;
      }
      const result = await importAccountTemplates(templates || []);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await refreshSavedTemplates();
      await refreshAccountTools();
      setStatusMessage(`Imported ${result.length} template${result.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setError("Import failed. Choose a valid JSON export file.");
    }
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    const result = await changePassword(passwordForm);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setStatusMessage("Password changed. Your session was refreshed.");
  };

  const handleRequestPasswordReset = async () => {
    const result = await requestPasswordReset();
    if (result?.error) {
      setError(result.error);
      return;
    }
    setStatusMessage(result?.detail || "Password reset email sent.");
  };

  return {
    accountStats,
    verificationStatus,
    passwordForm,
    handleChangePassword,
    handleExportAccountData,
    handleImportTemplateFile,
    handlePasswordFieldChange,
    handleRequestPasswordReset,
    refreshAccountTools,
  };
};

export default useAccountTools;
