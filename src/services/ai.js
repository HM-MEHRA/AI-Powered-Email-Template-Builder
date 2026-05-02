import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000/api";
const AUTH_STORAGE_KEY = "email-builder.auth-token";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const serializeToneSelection = (tone) => {
  if (Array.isArray(tone)) {
    return tone.filter(Boolean).join(", ");
  }

  return tone || "";
};

const normalizeHistoryItem = (item) => ({
  ...item,
  createdAt: item.createdAt || item.created_at,
});

const getStoredToken = () => {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(AUTH_STORAGE_KEY) || "";
};

export const setAuthToken = (token) => {
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, token);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    api.defaults.headers.common.Authorization = `Token ${token}`;
  } else {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    delete api.defaults.headers.common.Authorization;
  }
};

const bootstrapAuthToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  const token = getStoredToken();
  if (token) {
    api.defaults.headers.common.Authorization = `Token ${token}`;
  }
};

bootstrapAuthToken();

const toFriendlyError = (error, fallbackMessage) => {
  const data = error?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (data && typeof data === "object") {
    const firstFieldError = Object.values(data).flat().find(Boolean);
    if (firstFieldError) return String(firstFieldError);
  }
  if (error?.code === "ERR_NETWORK") {
    return "Cannot connect to backend. Start Django on http://127.0.0.1:8000, then refresh this page.";
  }
  if (error?.response?.status === 503) {
    return "The local AI service is not ready. Start Ollama and make sure llama3.2:1b or qwen2.5:1.5b is installed.";
  }
  return fallbackMessage;
};

export const isAuthenticated = () => Boolean(getStoredToken());

export const signup = async ({ username, email, password, firstName = "", lastName = "" }) => {
  try {
    const payload = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    };
    if (username) {
      payload.username = username;
    }
    const response = await api.post("/auth/signup/", payload);
    setAuthToken(response.data?.token);
    return response.data;
  } catch (error) {
    console.error(error);
    const message =
      error?.response?.data?.email?.[0] ||
      error?.response?.data?.username?.[0] ||
      error?.response?.data?.password?.[0] ||
      toFriendlyError(error, "Error creating account.");
    return { error: message };
  }
};

export const login = async ({ username, password }) => {
  try {
    const response = await api.post("/auth/login/", { username, password });
    setAuthToken(response.data?.token);
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error logging in.") };
  }
};

export const logout = async () => {
  try {
    await api.post("/auth/logout/");
  } catch (error) {
    console.error(error);
  } finally {
    setAuthToken("");
  }
};

export const fetchCurrentUser = async () => {
  if (!isAuthenticated()) return null;
  try {
    const response = await api.get("/auth/me/");
    return response.data;
  } catch (error) {
    console.error(error);
    if (error?.response?.status === 401) {
      setAuthToken("");
      return null;
    }
    return { error: toFriendlyError(error, "Error loading account.") };
  }
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  if (!isAuthenticated()) return { error: "Log in to change password." };
  try {
    const response = await api.post("/auth/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    setAuthToken(response.data?.token);
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error changing password.") };
  }
};

export const requestPasswordReset = async ({ email = "" } = {}) => {
  try {
    const response = await api.post("/auth/password-reset/", { email });
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error sending password reset email.") };
  }
};

export const confirmPasswordReset = async ({ uid, token, newPassword }) => {
  try {
    const response = await api.post("/auth/password-reset/confirm/", {
      uid,
      token,
      new_password: newPassword,
    });
    setAuthToken("");
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error resetting password.") };
  }
};

export const fetchVerificationStatus = async () => {
  if (!isAuthenticated()) return null;
  try {
    const response = await api.get("/auth/verification/");
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error loading verification status.") };
  }
};

export const fetchAccountStats = async () => {
  if (!isAuthenticated()) return null;
  try {
    const response = await api.get("/account/stats/");
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error loading account stats.") };
  }
};

export const exportAccountData = async () => {
  if (!isAuthenticated()) return { error: "Log in to export account data." };
  try {
    const response = await api.get("/account/export/");
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error exporting account data.") };
  }
};

export const importAccountTemplates = async (templates) => {
  if (!isAuthenticated()) return { error: "Log in to import templates." };
  try {
    const response = await api.post("/account/import-templates/", { templates });
    return response.data || [];
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error importing templates.") };
  }
};

export const updateAccountCategory = async ({ action, fromCategory, toCategory = "" }) => {
  if (!isAuthenticated()) return { error: "Log in to manage categories." };
  try {
    const response = await api.post("/account/categories/", {
      action,
      from_category: fromCategory,
      to_category: toCategory,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error updating category.") };
  }
};

const appendOptionalGenerationFields = (target, { brandVoice = "", language = "" } = {}) => {
  if (brandVoice) {
    target.append ? target.append("brand_voice", brandVoice) : (target.brand_voice = brandVoice);
  }
  if (language) {
    target.append ? target.append("language", language) : (target.language = language);
  }
};

export const generateEmail = async ({ subject, purpose, tone = "", variationCount = 4, file = null, ollamaModel = "", brandVoice = "", language = "" }) => {
  const toneValue = serializeToneSelection(tone);
  try {
    let response;
    if (file) {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("purpose", purpose);
      formData.append("tone", toneValue);
      formData.append("variation_count", variationCount);
      formData.append("ollama_model", ollamaModel);
      formData.append("file", file);
      appendOptionalGenerationFields(formData, { brandVoice, language });
      response = await api.post("/generateEmail/", formData);
    } else {
      const payload = {
        subject,
        purpose,
        tone: toneValue,
        variation_count: variationCount,
        ollama_model: ollamaModel,
      };
      appendOptionalGenerationFields(payload, { brandVoice, language });
      response = await api.post("/generateEmail/", payload);
    }

    return {
      ...response.data,
      history_entry: response.data?.history_entry
        ? normalizeHistoryItem(response.data.history_entry)
        : response.data?.history_entry,
    };
  } catch (error) {
    console.error(error);
    return { variations: [], error: toFriendlyError(error, "Error generating email.") };
  }
};

export const generateSingleEmailVariation = async ({
  subject,
  purpose,
  tone = "",
  variationCount = 4,
  styleIndex = 0,
  file = null,
  ollamaModel = "",
  brandVoice = "",
  language = "",
}) => {
  const toneValue = serializeToneSelection(tone);
  try {
    let response;
    if (file) {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("purpose", purpose);
      formData.append("tone", toneValue);
      formData.append("variation_count", variationCount);
      formData.append("style_index", styleIndex);
      formData.append("save_history", "false");
      formData.append("ollama_model", ollamaModel);
      formData.append("file", file);
      appendOptionalGenerationFields(formData, { brandVoice, language });
      response = await api.post("/generateEmail/", formData);
    } else {
      const payload = {
        subject,
        purpose,
        tone: toneValue,
        variation_count: variationCount,
        style_index: styleIndex,
        save_history: false,
        ollama_model: ollamaModel,
      };
      appendOptionalGenerationFields(payload, { brandVoice, language });
      response = await api.post("/generateEmail/", payload);
    }

    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error generating email variation.") };
  }
};

export const saveGeneratedHistory = async ({ subject, purpose, tone, prompt, variations }) => {
  if (!isAuthenticated()) {
    return { error: "Log in to save history to your account." };
  }
  try {
    const response = await api.post("/saveGeneratedHistory/", {
      subject,
      purpose,
      tone: serializeToneSelection(tone),
      prompt,
      variations,
    });
    return normalizeHistoryItem(response.data);
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error saving generated history.") };
  }
};

export const fetchEmailHistory = async () => {
  if (!isAuthenticated()) return [];
  try {
    const response = await api.get("/history/");
    return (response.data || []).map(normalizeHistoryItem);
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error loading email history.") };
  }
};

export const deleteHistoryItem = async (historyId) => {
  if (!isAuthenticated()) {
    return { error: "Log in to delete history." };
  }
  try {
    await api.delete(`/history/${historyId}/`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error deleting history item.") };
  }
};

export const clearEmailHistory = async () => {
  if (!isAuthenticated()) {
    return { error: "Log in to clear history." };
  }
  try {
    await api.delete("/history/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error clearing history.") };
  }
};

export const fetchSavedTemplates = async () => {
  if (!isAuthenticated()) return [];
  try {
    const response = await api.get("/templates/");
    return response.data || [];
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error loading saved templates.") };
  }
};

export const fetchDatabaseTemplates = async () => {
  if (!isAuthenticated()) {
    return { templates: [], access: null };
  }
  try {
    const response = await api.get("/database-templates/");
    return response.data || { templates: [], access: null };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error loading template library.") };
  }
};

export const createSavedTemplate = async ({ title, content, footer = "", imageUrl = "" }) => {
  if (!isAuthenticated()) {
    return { error: "Log in to save templates to your account." };
  }
  try {
    const response = await api.post("/templates/", {
      title,
      content,
      footer,
      image_url: imageUrl || null,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error saving template.") };
  }
};

export const updateSavedTemplate = async (templateId, payload) => {
  if (!isAuthenticated()) {
    return { error: "Log in to update templates." };
  }
  try {
    const response = await api.patch(`/templates/${templateId}/`, payload);
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error updating template.") };
  }
};

export const deleteSavedTemplate = async (templateId) => {
  if (!isAuthenticated()) {
    return { error: "Log in to delete templates." };
  }
  try {
    await api.delete(`/templates/${templateId}/`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error deleting template.") };
  }
};

export const restoreSavedTemplate = async (templateId) => {
  if (!isAuthenticated()) {
    return { error: "Log in to restore templates." };
  }
  try {
    const response = await api.post(`/templates/${templateId}/restore/`);
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error restoring template.") };
  }
};

export const clearArchivedTemplates = async () => {
  if (!isAuthenticated()) {
    return { error: "Log in to clear archived templates." };
  }
  try {
    const response = await api.delete("/account/archived-templates/clear/");
    return response.data || { deleted: 0 };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error clearing archived templates.") };
  }
};

export const favoriteTemplate = async (templateId) => {
  if (!isAuthenticated()) {
    return { error: "Log in to favorite templates." };
  }
  try {
    await api.post(`/templates/${templateId}/favorite/`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error adding favorite.") };
  }
};

export const unfavoriteTemplate = async (templateId) => {
  if (!isAuthenticated()) {
    return { error: "Log in to manage favorites." };
  }
  try {
    await api.delete(`/templates/${templateId}/favorite/`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error removing favorite.") };
  }
};

export const shareTemplate = async ({ templateId, sharedWithUsername, permission = "view" }) => {
  if (!isAuthenticated()) {
    return { error: "Log in to share templates." };
  }
  try {
    const response = await api.post(`/templates/${templateId}/share/`, {
      shared_with_username: sharedWithUsername,
      permission,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: toFriendlyError(error, "Error sharing template.") };
  }
};
