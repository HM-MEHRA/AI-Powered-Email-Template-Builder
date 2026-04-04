import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const normalizeHistoryItem = (item) => ({
  ...item,
  createdAt: item.createdAt || item.created_at,
});

export const generateEmail = async ({ subject, purpose, tone = "", variationCount = 4, file = null }) => {
  try {
    let response;
    if (file) {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("purpose", purpose);
      formData.append("tone", tone);
      formData.append("variation_count", variationCount);
      formData.append("file", file);
      response = await axios.post(`${API_BASE_URL}/generateEmail/`, formData);
    } else {
      response = await axios.post(`${API_BASE_URL}/generateEmail/`, {
        subject,
        purpose,
        tone,
        variation_count: variationCount,
      });
    }

    return {
      ...response.data,
      history_entry: response.data?.history_entry
        ? normalizeHistoryItem(response.data.history_entry)
        : response.data?.history_entry,
    };
  } catch (error) {
    console.error(error);
    const detail = error?.response?.data?.detail;
    const message =
      detail ||
      (error?.code === "ERR_NETWORK"
        ? "Cannot connect to backend. Start Django server on http://127.0.0.1:8000."
        : "Error generating email.");
    return { variations: [], error: message };
  }
};

export const generateSingleEmailVariation = async ({
  subject,
  purpose,
  tone = "",
  variationCount = 4,
  styleIndex = 0,
  file = null,
}) => {
  try {
    let response;
    if (file) {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("purpose", purpose);
      formData.append("tone", tone);
      formData.append("variation_count", variationCount);
      formData.append("style_index", styleIndex);
      formData.append("save_history", "false");
      formData.append("file", file);
      response = await axios.post(`${API_BASE_URL}/generateEmail/`, formData);
    } else {
      response = await axios.post(`${API_BASE_URL}/generateEmail/`, {
        subject,
        purpose,
        tone,
        variation_count: variationCount,
        style_index: styleIndex,
        save_history: false,
      });
    }

    return response.data;
  } catch (error) {
    console.error(error);
    const detail = error?.response?.data?.detail;
    const message =
      detail ||
      (error?.code === "ERR_NETWORK"
        ? "Cannot connect to backend. Start Django server on http://127.0.0.1:8000."
        : "Error generating email variation.");
    return { error: message };
  }
};

export const saveGeneratedHistory = async ({ subject, purpose, tone, prompt, variations }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/saveGeneratedHistory/`, {
      subject,
      purpose,
      tone,
      prompt,
      variations,
    });
    return normalizeHistoryItem(response.data);
  } catch (error) {
    console.error(error);
    const detail = error?.response?.data?.detail;
    const message = detail || "Error saving generated history.";
    return { error: message };
  }
};

export const fetchEmailHistory = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/history/`);
    return (response.data || []).map(normalizeHistoryItem);
  } catch (error) {
    console.error(error);
    const detail = error?.response?.data?.detail;
    const message =
      detail ||
      (error?.code === "ERR_NETWORK"
        ? "Cannot connect to backend. Start Django server on http://127.0.0.1:8000."
        : "Error loading email history.");
    return { error: message };
  }
};
