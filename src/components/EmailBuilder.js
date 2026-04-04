import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchEmailHistory, generateSingleEmailVariation, saveGeneratedHistory } from "../services/ai";

const TAB_ITEMS = [
  { label: "Generate", hash: "#generate" },
  { label: "Templates", hash: "#templates" },
  { label: "History", hash: "#history" },
];
const TONE_GROUPS = [
  {
    label: "Professional Tone",
    options: ["Formal", "Professional", "Polite", "Respectful", "Confident", "Persuasive", "Direct", "Corporate"],
  },
  {
    label: "Casual Tone",
    options: ["Friendly", "Casual", "Warm", "Excited", "Enthusiastic", "Inviting", "Playful", "Relaxed"],
  },
];
const TONE_STYLES = {
  Formal: {
    accent: "from-slate-900 via-slate-800 to-zinc-700",
    ring: "ring-slate-300",
    bg: "from-slate-50 to-white",
    text: "text-slate-800",
    note: "Boardroom ready",
  },
  Professional: {
    accent: "from-blue-700 via-sky-600 to-cyan-500",
    ring: "ring-sky-300",
    bg: "from-sky-50 to-white",
    text: "text-sky-900",
    note: "Clean and credible",
  },
  Polite: {
    accent: "from-emerald-700 via-emerald-600 to-teal-500",
    ring: "ring-emerald-300",
    bg: "from-emerald-50 to-white",
    text: "text-emerald-900",
    note: "Soft and respectful",
  },
  Respectful: {
    accent: "from-teal-700 via-cyan-600 to-sky-500",
    ring: "ring-cyan-300",
    bg: "from-cyan-50 to-white",
    text: "text-cyan-900",
    note: "Measured and warm",
  },
  Confident: {
    accent: "from-amber-600 via-orange-500 to-rose-500",
    ring: "ring-orange-300",
    bg: "from-orange-50 to-white",
    text: "text-orange-900",
    note: "Strong and decisive",
  },
  Persuasive: {
    accent: "from-rose-700 via-pink-600 to-orange-500",
    ring: "ring-rose-300",
    bg: "from-rose-50 to-white",
    text: "text-rose-900",
    note: "Convincing and vivid",
  },
  Direct: {
    accent: "from-zinc-900 via-neutral-800 to-stone-700",
    ring: "ring-zinc-300",
    bg: "from-zinc-50 to-white",
    text: "text-zinc-900",
    note: "Straight to the point",
  },
  Corporate: {
    accent: "from-indigo-800 via-blue-700 to-slate-700",
    ring: "ring-indigo-300",
    bg: "from-indigo-50 to-white",
    text: "text-indigo-900",
    note: "Structured and official",
  },
  Friendly: {
    accent: "from-amber-500 via-orange-400 to-pink-400",
    ring: "ring-amber-300",
    bg: "from-amber-50 to-white",
    text: "text-amber-900",
    note: "Open and approachable",
  },
  Casual: {
    accent: "from-lime-500 via-emerald-400 to-teal-400",
    ring: "ring-lime-300",
    bg: "from-lime-50 to-white",
    text: "text-lime-900",
    note: "Relaxed and easy",
  },
  Warm: {
    accent: "from-orange-500 via-amber-400 to-yellow-300",
    ring: "ring-amber-300",
    bg: "from-orange-50 to-white",
    text: "text-orange-900",
    note: "Kind and human",
  },
  Excited: {
    accent: "from-fuchsia-600 via-rose-500 to-orange-400",
    ring: "ring-fuchsia-300",
    bg: "from-fuchsia-50 to-white",
    text: "text-fuchsia-900",
    note: "High energy",
  },
  Enthusiastic: {
    accent: "from-violet-600 via-fuchsia-500 to-pink-400",
    ring: "ring-violet-300",
    bg: "from-violet-50 to-white",
    text: "text-violet-900",
    note: "Bold momentum",
  },
  Inviting: {
    accent: "from-cyan-500 via-sky-400 to-indigo-400",
    ring: "ring-sky-300",
    bg: "from-sky-50 to-white",
    text: "text-sky-900",
    note: "Welcoming and bright",
  },
  Playful: {
    accent: "from-pink-500 via-rose-400 to-amber-300",
    ring: "ring-pink-300",
    bg: "from-pink-50 to-white",
    text: "text-pink-900",
    note: "Fun and lively",
  },
  Relaxed: {
    accent: "from-teal-500 via-emerald-400 to-lime-300",
    ring: "ring-teal-300",
    bg: "from-teal-50 to-white",
    text: "text-teal-900",
    note: "Calm and smooth",
  },
};
const VARIATION_OPTIONS = [1, 2, 3, 4];
const buttonMotion = {
  whileHover: { scale: 1.03, y: -2 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.18, ease: "easeOut" },
};
const tabContentMotion = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.985 },
  transition: { duration: 0.38, ease: "easeOut" },
};
const templateListMotion = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};
const templateCardMotion = {
  hidden: { opacity: 0, y: 26, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};
const progressItemMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};
const scrollRevealMotion = {
  initial: { opacity: 0, y: 42, scale: 0.975, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};
const pageLoadMotion = {
  initial: { opacity: 0, y: 26, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6, ease: "easeOut" },
};
const toneCardMotion = {
  whileHover: { y: -3, scale: 1.01 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.18, ease: "easeOut" },
};
const scrollFloatMotion = {
  initial: { opacity: 0, y: 52, scale: 0.97, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.14 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
};

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getTabFromHash = (hash) =>
  TAB_ITEMS.find((item) => item.hash === (hash || "").toLowerCase())?.label || "Generate";

const getHashForTab = (label) =>
  TAB_ITEMS.find((item) => item.label === label)?.hash || "#generate";

const buildTemplateText = (template) =>
  [
    `Subject: ${template.subject}`,
    "",
    template.greeting,
    "",
    template.body,
    "",
    template.closing,
    template.signature,
  ].join("\n");

const buildEmailBody = (template) =>
  [template.greeting, "", template.body, "", template.closing, template.signature].join("\n");

const sanitizeFileName = (value, fallback = "email-template") => {
  const cleaned = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
};

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildTemplatePreviewHtml = (template, attachmentName) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(template.subject || "Email Template")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #e2e8f0;
        --panel: #ffffff;
        --accent: #f59e0b;
        --bg: linear-gradient(180deg, #fffdf7 0%, #f8fafc 100%);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background: var(--bg);
        padding: 32px 18px;
      }
      .sheet {
        max-width: 860px;
        margin: 0 auto;
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: #b45309;
        font: 600 12px/1.4 Arial, sans-serif;
        letter-spacing: 0.28em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font: 700 32px/1.2 Arial, sans-serif;
      }
      .meta {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 16px;
        background: #fff7ed;
        color: var(--muted);
        font: 500 14px/1.6 Arial, sans-serif;
      }
      .email {
        margin-top: 28px;
        white-space: pre-wrap;
        font-size: 18px;
        line-height: 1.8;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <p class="eyebrow">Email Template Preview</p>
      <h1>${escapeHtml(template.subject || "Untitled Email")}</h1>
      <div class="meta">
        <strong>Attachment:</strong> ${escapeHtml(attachmentName || "No attachment included")}
      </div>
      <section class="email">${escapeHtml(buildEmailBody(template))}</section>
    </main>
  </body>
</html>`;

const downloadBlob = ({ blob, fileName }) => {
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

const cloneTemplate = (template) => ({
  id: template.id,
  label: template.label,
  subject: template.subject || "",
  greeting: template.greeting || "",
  body: template.body || "",
  closing: template.closing || "",
  signature: template.signature || "",
});

const openMailClient = (template) => {
  const subject = encodeURIComponent(template.subject || "");
  const body = encodeURIComponent(buildEmailBody(template));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

const openGmailCompose = (template) => {
  const subject = encodeURIComponent(template.subject || "");
  const body = encodeURIComponent(buildEmailBody(template));
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
};

const TemplateCard = ({
  template,
  index,
  isSelected,
  onApply,
  onCopy,
  onOpenMail,
  onOpenGmail,
  onDownload,
}) => (
  <motion.article
    variants={templateCardMotion}
    whileHover={{ y: -10, scale: 1.012, boxShadow: "0 32px 80px rgba(15,23,42,0.16)" }}
    transition={{ duration: 0.22, ease: "easeOut" }}
    className={`relative overflow-hidden rounded-[28px] border p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition ${
      isSelected ? "border-amber-300 bg-[linear-gradient(180deg,rgba(255,247,237,0.92)_0%,rgba(255,251,235,0.86)_100%)]" : "border-slate-200 bg-white/95"
    }`}
  >
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-24 ${
        isSelected
          ? "bg-[linear-gradient(90deg,rgba(249,115,22,0.20)_0%,rgba(250,204,21,0.12)_48%,rgba(255,255,255,0)_100%)]"
          : "bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_0%,rgba(59,130,246,0.06)_52%,rgba(255,255,255,0)_100%)]"
      }`}
    />
    <motion.div
      aria-hidden="true"
      animate={{ x: [0, 12, 0], opacity: [0.55, 0.9, 0.55] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className={`pointer-events-none absolute right-5 top-5 h-16 w-16 rounded-full blur-xl ${
        isSelected ? "bg-amber-300/35" : "bg-sky-200/30"
      }`}
    />
    <div className="relative flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          Variation {index + 1}
        </div>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{template.subject}</h3>
        {isSelected && (
          <p className="mt-2 text-sm font-medium text-amber-800">Selected for editing and export</p>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 sm:gap-3"
      >
        <motion.button
          type="button"
          {...buttonMotion}
          onClick={() => onCopy(template)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
        >
          Copy
        </motion.button>
        <motion.button
          type="button"
          {...buttonMotion}
          onClick={() => onApply(template)}
          className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_62%,#f97316_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
        >
          Use This
        </motion.button>
      </motion.div>
    </div>

    <div className="relative mt-5 grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Subject</p>
        <p className="mt-2 text-sm text-slate-800">{template.subject}</p>
      </section>
      <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Greeting</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{template.greeting}</p>
      </section>
      <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100 md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Body</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">{template.body}</p>
      </section>
      <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Closing</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{template.closing}</p>
      </section>
      <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Signature</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{template.signature}</p>
      </section>
    </div>
  </motion.article>
);

const EmailBuilder = () => {
  const [activeTab, setActiveTab] = useState(() =>
    typeof window === "undefined" ? "Generate" : getTabFromHash(window.location.hash)
  );
  const [form, setForm] = useState({
    subject: "",
    purpose: "",
    tone: "Professional",
  });
  const [variationCount, setVariationCount] = useState(4);
  const [attachment, setAttachment] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editableTemplate, setEditableTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [buttonProgress, setButtonProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState([]);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncTabFromLocation = () => {
      setActiveTab(getTabFromHash(window.location.hash));
    };

    if (!window.location.hash) {
      window.history.replaceState({ tab: "Generate" }, "", "#generate");
    } else {
      syncTabFromLocation();
    }

    window.addEventListener("popstate", syncTabFromLocation);
    return () => window.removeEventListener("popstate", syncTabFromLocation);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = "auto";
    };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const result = await fetchEmailHistory();
      if (result?.error) {
        setError(result.error);
        return;
      }

      setHistory(result || []);
    };

    loadHistory();
  }, []);

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const templateCountLabel = useMemo(() => {
    if (!templates.length) return "No templates yet";
    return `${templates.length} email variations ready`;
  }, [templates]);

  const generateButtonLabel = useMemo(() => {
    if (variationCount === 1) return "Generate Email";
    return `Generate ${variationCount} Variations`;
  }, [variationCount]);

  const navigateToTab = (tab, options = {}) => {
    const nextHash = getHashForTab(tab);
    setActiveTab(tab);

    if (typeof window === "undefined") return;
    if (window.location.hash === nextHash && !options.replace) return;

    const historyMethod = options.replace ? "replaceState" : "pushState";
    window.history[historyMethod]({ tab }, "", nextHash);
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateEditableTemplate = (key, value) => {
    setEditableTemplate((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setAttachment(nextFile);
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError("");
    setGenerationProgress([]);
    setButtonProgress(0);

    if (!form.subject.trim()) {
      setError("Add a subject to generate email variations.");
      return;
    }

    setIsGenerating(true);
    setButtonProgress(8);
    const nextTemplates = [];
    const nextProgress = [];

    for (let index = 0; index < variationCount; index += 1) {
      const result = await generateSingleEmailVariation({
        subject: form.subject.trim(),
        purpose: form.purpose.trim(),
        tone: form.tone,
        variationCount,
        styleIndex: index,
        file: attachment,
      });

      if (result?.error || !result?.variation) {
        setError(result?.error || `Failed while generating draft ${index + 1}.`);
        setIsGenerating(false);
        setButtonProgress(0);
        return;
      }

      nextTemplates.push(result.variation);
      nextProgress.push(`Draft ${index + 1} ready`);
      setGenerationProgress([...nextProgress]);
      setButtonProgress(Math.min(92, Math.round(((index + 1) / variationCount) * 92)));
    }

    const historyEntry = await saveGeneratedHistory({
      subject: form.subject.trim(),
      purpose: form.purpose.trim(),
      tone: form.tone,
      prompt: [form.subject.trim(), form.purpose.trim()].filter(Boolean).join(". "),
      variations: nextTemplates,
    });
    setButtonProgress(100);

    const chosenTemplate = cloneTemplate(nextTemplates[0]);
    setTemplates(nextTemplates);
    setSelectedTemplate(chosenTemplate);
    setEditableTemplate(chosenTemplate);
    if (!historyEntry?.error) {
      setHistory((current) => [historyEntry, ...current].slice(0, 20));
    }
    navigateToTab("Templates");
    setStatusMessage("Generated fresh email variations.");
    setIsGenerating(false);
    window.setTimeout(() => setButtonProgress(0), 500);
  };

  const handleApplyTemplate = (template) => {
    const chosenTemplate = cloneTemplate(template);
    setSelectedTemplate(chosenTemplate);
    setEditableTemplate(chosenTemplate);
    setForm((current) => ({
      ...current,
      subject: chosenTemplate.subject,
    }));
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

  const handleDownloadTemplate = (template) => {
    const html = buildTemplatePreviewHtml(template, attachment?.name);
    const baseName = sanitizeFileName(template.subject, "email-template");
    const htmlBlob = new Blob([html], { type: "text/html;charset=utf-8" });
    const previewUrl = downloadBlob({
      blob: htmlBlob,
      fileName: `${baseName}.html`,
    });

    window.open(previewUrl, "_blank", "noopener,noreferrer");

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
    const restoredTemplates = item.variations || [];
    const chosenTemplate = restoredTemplates[0] ? cloneTemplate(restoredTemplates[0]) : null;

    setForm({
      subject: item.subject,
      purpose: item.purpose,
      tone: item.tone,
    });
    setTemplates(restoredTemplates);
    setSelectedTemplate(chosenTemplate);
    setEditableTemplate(chosenTemplate);
    navigateToTab("Templates");
    setStatusMessage("Loaded templates from history.");
  };

  return (
    <motion.div
      {...pageLoadMotion}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.30),_transparent_24%),radial-gradient(circle_at_85%_10%,_rgba(14,165,233,0.22),_transparent_22%),radial-gradient(circle_at_50%_100%,_rgba(244,63,94,0.16),_transparent_30%),linear-gradient(135deg,_#fff7ed_0%,_#fffbeb_22%,_#f8fafc_48%,_#eff6ff_70%,_#eef2ff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,250,245,0.92)_100%)] shadow-[0_30px_120px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,rgba(251,146,60,0.15)_0%,rgba(245,158,11,0.10)_35%,rgba(56,189,248,0.12)_100%)]" />
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, 18, 0], y: [0, 14, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -left-16 top-20 h-44 w-44 rounded-full bg-orange-300/30 blur-3xl"
          />
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, -20, 0], y: [0, 12, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute right-0 top-8 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl"
          />
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute bottom-10 left-1/3 h-40 w-40 rounded-full bg-rose-300/20 blur-3xl"
          />
          <div className="border-b border-slate-200/80 px-6 py-8 sm:px-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="max-w-3xl">
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: "easeOut" }}
                  className="inline-flex rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-semibold uppercase tracking-[0.4em] text-amber-700 shadow-[0_10px_30px_rgba(251,146,60,0.12)]"
                >
                  AI-Powered Email Template Builder
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut", delay: 0.05 }}
                  className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl"
                >
                  Turn one prompt into
                  <span className="block bg-[linear-gradient(90deg,#ea580c_0%,#f59e0b_38%,#0f172a_100%)] bg-clip-text text-transparent">
                    polished email drafts
                  </span>
                  that actually feel ready to send.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut", delay: 0.1 }}
                  className="mt-4 max-w-2xl text-base leading-7 text-slate-600"
                >
                  Generate multiple variations from the same brief, compare the strongest voice, and move straight into copy, edit, or send mode without losing momentum.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
                  className="mt-6 flex flex-wrap gap-3"
                >
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="rounded-full border border-rose-200/90 bg-[linear-gradient(135deg,rgba(255,241,242,0.98)_0%,rgba(255,228,230,0.95)_100%)] px-4 py-2 text-sm font-medium text-rose-900 shadow-[0_10px_24px_rgba(244,63,94,0.14)]">
                    Multi-variation generation
                  </motion.div>
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="rounded-full border border-amber-200/90 bg-amber-50/90 px-4 py-2 text-sm font-medium text-amber-800 shadow-[0_10px_24px_rgba(245,158,11,0.10)]">
                    Live animated generation state
                  </motion.div>
                  <motion.div whileHover={{ y: -4, scale: 1.02 }} className="rounded-full border border-sky-200/90 bg-sky-50/90 px-4 py-2 text-sm font-medium text-sky-800 shadow-[0_10px_24px_rgba(14,165,233,0.10)]">
                    Instant export workflow
                  </motion.div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
                whileHover={{ y: -6, rotate: -0.4, boxShadow: "0 30px 75px rgba(15,23,42,0.28)" }}
                className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(15,23,42,0.98)_0%,rgba(30,41,59,0.97)_40%,rgba(124,45,18,0.95)_100%)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(251,146,60,0.34)_0%,rgba(56,189,248,0.16)_100%)]" />
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: [0, 8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute -right-10 top-10 h-28 w-28 rounded-full border border-white/15 bg-white/10 blur-sm"
                />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-orange-200">Creative Snapshot</p>
                  <h3 className="mt-3 text-3xl font-semibold leading-tight">
                    Build, compare, and ship stronger email copy faster.
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-slate-200">
                    The builder is tuned for quick iteration, cleaner tone choices, and a more visual generation flow.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} className="flex min-h-[132px] flex-col rounded-3xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-orange-200">Generate</p>
                      <p className="mt-3 text-2xl font-semibold leading-none text-white">1-4</p>
                      <p className="mt-auto pt-4 text-xs text-slate-300">distinct drafts</p>
                    </motion.div>
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} className="flex min-h-[132px] flex-col rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Tone</p>
                      <p className="mt-3 pr-2 text-[1.18rem] font-semibold leading-tight text-white sm:text-[1.24rem]">
                        {form.tone}
                      </p>
                      <p className="mt-auto pt-4 text-xs text-slate-300">current style</p>
                    </motion.div>
                    <motion.div whileHover={{ y: -5, scale: 1.02 }} className="flex min-h-[132px] flex-col rounded-3xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200">Templates</p>
                      <p className="mt-3 text-2xl font-semibold leading-none text-white">{templates.length || 0}</p>
                      <p className="mt-auto pt-4 text-xs text-slate-300">{templateCountLabel}</p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>

            <nav className="mt-8 flex flex-wrap gap-3" aria-label="Builder sections">
              {TAB_ITEMS.map((tab) => (
                <motion.button
                  key={tab.label}
                  type="button"
                  {...buttonMotion}
                  onClick={() => navigateToTab(tab.label)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.label
                      ? "bg-[linear-gradient(135deg,#0f172a_0%,#334155_55%,#ea580c_100%)] text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                      : "bg-white/85 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
                  }`}
                >
                  {tab.label}
                </motion.button>
              ))}
            </nav>
          </div>

          <div className="px-6 py-8 sm:px-10">
            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            )}

            <AnimatePresence mode="wait">
            {activeTab === "Generate" && (
              <motion.div
                key="generate-tab"
                {...tabContentMotion}
                className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]"
              >
                <form onSubmit={handleGenerate} className="space-y-6">
                  <motion.div
                    {...scrollFloatMotion}
                    className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100"
                  >
                    <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(event) => updateField("subject", event.target.value)}
                      placeholder="Quarterly product update"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                    />

                    <label className="mt-6 block text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Purpose
                    </label>
                    <textarea
                      value={form.purpose}
                      onChange={(event) => updateField("purpose", event.target.value)}
                      placeholder="Optional: explain what the email should achieve, who it is for, and the key point you want to land."
                      rows="7"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                    />

                    <label className="mt-6 block text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Tone
                    </label>
                    <div className="mt-3 space-y-4">
                      {TONE_GROUPS.map((group) => (
                        <div
                          key={group.label}
                          className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">
                            {group.label}
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {group.options.map((tone) => {
                              const isSelected = form.tone === tone;
                              const style = TONE_STYLES[tone] || {
                                accent: "from-slate-800 to-slate-600",
                                ring: "ring-slate-300",
                                bg: "from-slate-50 to-white",
                                text: "text-slate-900",
                                note: "Balanced tone",
                              };

                              return (
                                <motion.button
                                  key={tone}
                                  type="button"
                                  {...toneCardMotion}
                                  onClick={() => updateField("tone", tone)}
                                  className={`group relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition ${
                                    isSelected
                                      ? `border-transparent bg-gradient-to-br ${style.accent} text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]`
                                      : `border-slate-200 bg-gradient-to-br ${style.bg} hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]`
                                  }`}
                                >
                                  <span
                                    className={`absolute inset-0 opacity-0 transition group-hover:opacity-100 ${
                                      isSelected
                                        ? "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_42%)]"
                                        : "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.95),_transparent_45%)]"
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span className="relative flex min-h-[104px] flex-col pt-1">
                                    <span>
                                      <span
                                        className={`block text-[1rem] font-semibold leading-tight ${
                                          isSelected ? "text-white" : "text-slate-900"
                                        }`}
                                      >
                                        {tone}
                                      </span>
                                      <span
                                        className={`mt-2 block text-xs ${
                                          isSelected ? "text-white/80" : style.text
                                        }`}
                                      >
                                        {style.note}
                                      </span>
                                    </span>
                                    {isSelected ? (
                                      <span className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                                        On
                                      </span>
                                    ) : (
                                      <span
                                        className={`mt-auto inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.text} ring-1 ${style.ring} border-white/80 bg-white/80`}
                                      >
                                        Pick
                                      </span>
                                    )}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <label className="mt-6 block text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Attachment
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Optional: upload a PDF, DOC, TXT, PNG, or JPG to provide extra context for the email.
                    </p>
                    {attachment && (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        Attached: {attachment.name}
                      </p>
                    )}

                    <div className="mt-6">
                      <label className="block text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Variations
                      </label>
                      <div className="mt-3 inline-flex rounded-full bg-slate-100 p-1 ring-1 ring-slate-200">
                        {VARIATION_OPTIONS.map((count) => (
                          <motion.button
                            key={count}
                            type="button"
                            {...buttonMotion}
                            onClick={() => setVariationCount(count)}
                            className={`min-w-12 rounded-full px-4 py-2 text-sm font-semibold transition ${
                              variationCount === count
                                ? "bg-slate-950 text-white shadow-sm"
                                : "text-slate-600 hover:bg-white"
                            }`}
                          >
                            {count}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      {...buttonMotion}
                      disabled={isGenerating}
                      className={`relative mt-6 inline-flex w-full items-center justify-center overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold text-white transition ${
                        isGenerating
                          ? "bg-slate-950 shadow-[0_18px_45px_rgba(249,115,22,0.28)]"
                          : "bg-slate-950 hover:bg-slate-700"
                      } disabled:cursor-not-allowed disabled:bg-slate-400`}
                    >
                      {isGenerating && (
                        <motion.span
                          aria-hidden="true"
                          animate={{
                            opacity: [0.35, 0.75, 0.35],
                            scale: [1, 1.04, 1],
                          }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16),_transparent_60%)]"
                        />
                      )}
                      {isGenerating && (
                        <motion.span
                          aria-hidden="true"
                          initial={{ width: 0 }}
                          animate={{ width: `${buttonProgress}%` }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(244,63,94,0.98)_0%,rgba(249,115,22,0.98)_35%,rgba(250,204,21,0.98)_70%,rgba(255,237,213,0.95)_100%)] shadow-[0_0_30px_rgba(249,115,22,0.45)]"
                        />
                      )}
                      {isGenerating && (
                        <motion.span
                          aria-hidden="true"
                          animate={{
                            x: ["-20%", "120%"],
                            opacity: [0, 0.95, 0],
                          }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-y-[12%] left-0 w-24 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.18)_30%,rgba(255,255,255,0.9)_50%,rgba(255,255,255,0.18)_70%,transparent_100%)] blur-[1px]"
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-3">
                        {isGenerating ? (
                          <motion.span
                            animate={{ letterSpacing: ["0.02em", "0.08em", "0.02em"] }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                            className="text-white"
                          >
                            Generating...
                          </motion.span>
                        ) : (
                          generateButtonLabel
                        )}
                      </span>
                    </motion.button>

                    {isGenerating && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                          Generating {variationCount === 1 ? "your draft" : `${variationCount} drafts`}...
                        </p>
                        <div className="mt-3 space-y-2">
                          {Array.from({ length: variationCount }).map((_, index) => (
                            <motion.p
                              key={`${index}-${generationProgress[index] || "pending"}`}
                              {...progressItemMotion}
                              className={`text-sm ${generationProgress[index] ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {generationProgress[index] || `Draft ${index + 1} in progress...`}
                            </motion.p>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </form>

                <div className="flex h-full min-h-full flex-col gap-4 self-stretch">
                  <motion.div
                    {...scrollFloatMotion}
                    transition={{ ...scrollRevealMotion.transition, delay: 0.08 }}
                    className="rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
                  >
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Workflow</p>
                    <h2 className="mt-3 text-2xl font-semibold">Choose a variation, refine it, and export it.</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      The selected template appears here for quick editing so the Use This button does something concrete, not just visual.
                    </p>
                    {attachment && (
                      <p className="mt-4 text-sm leading-7 text-slate-300">
                        Attached file context will be included while generating: {attachment.name}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    {...scrollFloatMotion}
                    transition={{ ...scrollRevealMotion.transition, delay: 0.11 }}
                    className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_42%,rgba(255,247,237,0.92)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(249,115,22,0.14)_0%,rgba(56,189,248,0.12)_52%,rgba(244,114,182,0.12)_100%)]" />
                    <motion.div
                      aria-hidden="true"
                      animate={{ x: [0, 10, 0], y: [0, -8, 0], rotate: [0, 6, 0] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="pointer-events-none absolute -right-8 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.3)_0%,rgba(251,146,60,0)_68%)] blur-sm"
                    />
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="inline-flex items-center rounded-full border border-orange-200 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700 shadow-[0_10px_24px_rgba(249,115,22,0.08)] backdrop-blur">
                          Example Walkthrough
                        </div>
                        <h3 className="mt-3 max-w-xl text-[1.85rem] font-semibold leading-tight text-slate-900">
                          What a good prompt can look like
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                          Use a clear subject, explain the goal, and let the tone guide the style. Then compare the generated drafts and press <span className="font-semibold text-slate-900">Use This</span> on the one you want to refine.
                        </p>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[28px] border border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.98)_100%)] p-4 shadow-[0_16px_36px_rgba(245,158,11,0.10)]">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">Sample Input</p>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                              Prompt
                            </span>
                          </div>
                          <div className="mt-3 space-y-2.5 text-sm leading-7 text-slate-700">
                            <div className="rounded-2xl bg-white/75 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Subject</p>
                              <p className="mt-2 text-base font-semibold text-slate-900">Internship follow-up</p>
                            </div>
                            <div className="rounded-2xl bg-white/75 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Purpose</p>
                              <p className="mt-2">Thank the interviewer, show continued interest, and ask politely about next steps.</p>
                            </div>
                            <div className="rounded-2xl bg-white/75 px-4 py-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tone</p>
                              <p className="mt-2">
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">Warm</span>
                                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Professional</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(59,130,246,0.08)_0%,rgba(244,114,182,0.08)_100%)]" />
                          <div className="relative flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sample Draft Shape</p>
                            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                              Output
                            </span>
                          </div>
                          <div className="relative mt-3 rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700">
                            <p className="font-semibold text-slate-900">Subject: Thank You for the Interview Opportunity</p>
                            <p className="mt-4">Hello [Name],</p>
                            <p className="mt-3">Thank you for taking the time to speak with me about the internship role. I enjoyed learning more about the team and the work you are doing.</p>
                            <p className="mt-3">I remain very interested in the opportunity and would be glad to provide any further information if needed.</p>
                            <p className="mt-4">Best regards,<br />[Your Name]</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    {...scrollFloatMotion}
                    transition={{ ...scrollRevealMotion.transition, delay: 0.14 }}
                    className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Selected Draft</p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                          {editableTemplate ? editableTemplate.subject : "No template selected"}
                        </h3>
                      </div>
                      {editableTemplate && (
                        <div className="flex flex-wrap gap-3">
                          <motion.button
                            type="button"
                            {...buttonMotion}
                            onClick={() => handleCopyTemplate(editableTemplate)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Copy
                          </motion.button>
                          <motion.button
                            type="button"
                            {...buttonMotion}
                            onClick={() => handleOpenMailTemplate(editableTemplate)}
                            className="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
                          >
                            Outlook
                          </motion.button>
                          <motion.button
                            type="button"
                            {...buttonMotion}
                            onClick={() => handleOpenGmailTemplate(editableTemplate)}
                            className="rounded-full border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-200"
                          >
                            Gmail
                          </motion.button>
                          <motion.button
                            type="button"
                            {...buttonMotion}
                            onClick={() => handleDownloadTemplate(editableTemplate)}
                            className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-200"
                          >
                            Download
                          </motion.button>
                        </div>
                      )}
                    </div>

                    {editableTemplate ? (
                      <div className="mt-6 grid min-h-0 flex-1 gap-4">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={editableTemplate.subject}
                            onChange={(event) => updateEditableTemplate("subject", event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Greeting
                          </label>
                          <input
                            type="text"
                            value={editableTemplate.greeting}
                            onChange={(event) => updateEditableTemplate("greeting", event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                            Body
                          </label>
                          <textarea
                            value={editableTemplate.body}
                            onChange={(event) => updateEditableTemplate("body", event.target.value)}
                            rows="10"
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                              Closing
                            </label>
                            <input
                              type="text"
                              value={editableTemplate.closing}
                              onChange={(event) => updateEditableTemplate("closing", event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                              Signature
                            </label>
                            <input
                              type="text"
                              value={editableTemplate.signature}
                              onChange={(event) => updateEditableTemplate("signature", event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        Generate templates or choose one from the Templates tab to load it into this editor.
                      </p>
                    )}
                  </motion.div>

                </div>
              </motion.div>
            )}

            {activeTab === "Templates" && (
              <motion.div
                key="templates-tab"
                {...tabContentMotion}
                className="space-y-6"
              >
                {templates.length ? (
                  <>
                    <div className="flex flex-col gap-3 rounded-[28px] bg-slate-950 px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Templates</p>
                        <h2 className="mt-2 text-2xl font-semibold">Compare your generated email drafts</h2>
                      </div>
                      <p className="text-sm text-slate-300">
                        Each card includes Copy, Use This, Outlook, and Gmail actions so you can compare and send quickly.
                      </p>
                    </div>

                    <motion.div
                      variants={templateListMotion}
                      initial="hidden"
                      animate="show"
                      className="grid gap-6 xl:grid-cols-2"
                    >
                      {templates.map((template, index) => (
                        <TemplateCard
                          key={template.id || `${template.subject}-${index}`}
                          template={template}
                          index={index}
                          isSelected={selectedTemplate?.id === template.id}
                          onApply={handleApplyTemplate}
                          onCopy={handleCopyTemplate}
                          onOpenMail={handleOpenMailTemplate}
                          onOpenGmail={handleOpenGmailTemplate}
                          onDownload={handleDownloadTemplate}
                        />
                      ))}
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    {...scrollFloatMotion}
                    className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
                  >
                    <h2 className="text-2xl font-semibold text-slate-900">No templates yet</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                      Start in the Generate tab, enter your subject and purpose, and the app will create several natural-sounding email variations for comparison.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "History" && (
              <motion.div
                key="history-tab"
                {...tabContentMotion}
                className="space-y-5"
              >
                {history.length ? (
                  history.map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      {...buttonMotion}
                      initial={{ opacity: 0, y: 36, scale: 0.985, filter: "blur(6px)" }}
                      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => handleOpenHistoryItem(item)}
                      className="block w-full rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                            {formatDate(item.createdAt)}
                          </p>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{item.subject}</h3>
                          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.purpose}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tone</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{item.tone}</p>
                          <p className="mt-2 text-xs text-slate-500">{item.variations?.length || 0} templates saved</p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <motion.div
                    {...scrollRevealMotion}
                    className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
                  >
                    <h2 className="text-2xl font-semibold text-slate-900">History is empty</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                      Generated email sets will appear here automatically so you can reopen past drafts without losing them.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default EmailBuilder;
