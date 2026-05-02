import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AccountPage from "./emailBuilder/AccountPage";
import DatabaseTemplatesPage from "./emailBuilder/DatabaseTemplatesPage";
import FreshEmailsPage from "./emailBuilder/FreshEmailsPage";
import GenerateTab from "./emailBuilder/GenerateTab";
import HistoryPage from "./emailBuilder/HistoryPage";
import TemplatesPage from "./emailBuilder/TemplatesPage";
import {
  BRAND_VOICE_PRESETS,
  COLOR_THEMES,
  FONT_OPTIONS,
  GENERATE_STEPS,
  LANGUAGE_OPTIONS,
  PROMPT_STARTERS,
  STORAGE_KEYS,
  TAB_ITEMS,
  TONE_BLUEPRINT,
  TONE_GROUPS,
  TONE_PRESETS,
  TONE_STRATEGY_FIT,
  TONE_STYLES,
  VARIATION_LABELS,
  VARIATION_OPTIONS,
  WALKTHROUGH_EXAMPLES,
} from "./emailBuilder/builderConstants";
import {
  formatDate,
  formatToneList,
  getHashForTab,
  getTabFromHash,
  parseToneList,
  readLocalStorage,
  reorderList,
  writeLocalStorage,
} from "./emailBuilder/builderUtils";
import { buttonMotion, pageLoadMotion } from "./emailBuilder/motion";
import { getAttachmentExtension } from "./emailBuilder/previewUtils";
import useEmailGeneration from "./emailBuilder/hooks/useEmailGeneration";
import useEmailEditor from "./emailBuilder/hooks/useEmailEditor";
import useTemplates from "./emailBuilder/hooks/useTemplates";
import useAccountTools from "./emailBuilder/hooks/useAccountTools";

const DEFAULT_GENERATE_FORM = {
  subject: "",
  purpose: "",
  tones: ["Formal"],
  toneMode: "single",
};

const normalizeGenerateForm = (value = {}) => {
  const legacyTone = value.tone || value.toneModeValue || "";
  const tones = parseToneList(value.tones || legacyTone || ["Formal"]);
  const toneMode = value.toneMode === "multiple" && tones.length > 1 ? "multiple" : "single";

  return {
    subject: typeof value.subject === "string" ? value.subject : "",
    purpose: typeof value.purpose === "string" ? value.purpose : "",
    tones: toneMode === "single" ? [tones[0] || "Formal"] : tones,
    toneMode,
  };
};

const EmailBuilder = ({ currentUser = null }) => {
  const [activeTab, setActiveTab] = useState(() =>
    typeof window === "undefined" ? "Generate" : getTabFromHash(window.location.hash)
  );
  const [generateStep, setGenerateStep] = useState("prompt");
  const [form, setForm] = useState(DEFAULT_GENERATE_FORM);
  const [variationCount, setVariationCount] = useState(1);
  const [attachment, setAttachment] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editableTemplate, setEditableTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [buttonProgress, setButtonProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState([]);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [brandVoice, setBrandVoice] = useState(() => {
    const storedBrandVoice = readLocalStorage(STORAGE_KEYS.brandVoice, "");
    return storedBrandVoice === "Warm and trustworthy" ? "" : storedBrandVoice;
  });
  const [language, setLanguage] = useState("English");
  const [previewTheme, setPreviewTheme] = useState(COLOR_THEMES[0]);
  const [previewFont, setPreviewFont] = useState(FONT_OPTIONS[0]);
  const [previewSpacing, setPreviewSpacing] = useState("comfortable");
  const [editorSectionOrder, setEditorSectionOrder] = useState(["greeting", "body", "closing", "signature"]);
  const [draggedSection, setDraggedSection] = useState("");

  const activeWalkthrough = WALKTHROUGH_EXAMPLES[walkthroughIndex];
  const displayName = `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || currentUser?.username || "Creator";

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
    if (!statusMessage) return undefined;
    const timer = window.setTimeout(() => setStatusMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    writeLocalStorage(STORAGE_KEYS.brandVoice, brandVoice);
  }, [brandVoice]);

  useEffect(() => {
    writeLocalStorage(STORAGE_KEYS.draft, {
      form,
      editableTemplate,
      previewTheme,
      previewFont,
      previewSpacing,
      language,
    });
  }, [form, editableTemplate, previewTheme, previewFont, previewSpacing, language]);

  useEffect(() => {
    const draft = readLocalStorage(STORAGE_KEYS.draft, null);
    if (!draft) return;
    if (draft.form) setForm(normalizeGenerateForm(draft.form));
    if (draft.editableTemplate) setEditableTemplate(draft.editableTemplate);
    if (draft.previewTheme) setPreviewTheme(draft.previewTheme);
    if (draft.previewFont) setPreviewFont(draft.previewFont);
    if (draft.previewSpacing) setPreviewSpacing(draft.previewSpacing);
    if (draft.language) setLanguage(draft.language);
  }, []);

  const navigateToTab = (tab, options = {}) => {
    const nextHash = getHashForTab(tab);
    setActiveTab(tab);

    if (typeof window === "undefined") return;
    if (window.location.hash === nextHash && !options.replace) return;

    const historyMethod = options.replace ? "replaceState" : "pushState";
    window.history[historyMethod]({ tab }, "", nextHash);
  };

  const scrollGenerateStepIntoView = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document.getElementById("generate-step-start")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const {
    activeTemplateSection,
    combinedTemplates,
    compareTemplateIds,
    compareTemplates,
    comparisonSummary,
    databaseTemplateAccess,
    databaseTemplateCategories,
    databaseTemplateCategoryFilter,
    databaseTemplates,
    favoriteTemplateIds,
    filteredHistory,
    paginatedHistory,
    history,
    historyPage,
    historyPageCount,
    historySearch,
    historyToneFilter,
    pendingDeleteTemplate,
    recentlyDeletedTemplates,
    categoryManager,
    manageableTemplateCategories,
    renameTemplate,
    renameTemplateArchived,
    renameTemplateCategory,
    renameTemplateTags,
    renameTemplateTitle,
    savedTemplates,
    savedTemplateCategories,
    selectedSavedTemplates,
    templateCountLabel,
    templateArchiveFilter,
    templateCategoryFilter,
    templateSearch,
    templateSort,
    visibleSavedTemplates,
    visibleDatabaseTemplates,
    visibleUnsavedTemplates,
    handleToggleFavorite,
    cancelDeleteTemplate,
    cancelRenameTemplate,
    clearArchivedSavedTemplates,
    confirmDeleteTemplate,
    confirmDeleteSelectedSavedTemplates,
    dismissRecentlyDeletedTemplate,
    handleClearHistory,
    handleDeleteHistoryItem,
    refreshSavedTemplates,
    refreshDatabaseTemplates,
    renameCategory,
    requestDeleteTemplate,
    restoreRecentlyDeletedTemplate,
    deleteCategory,
    setActiveTemplateSection,
    setCompareTemplateIds,
    setHistory,
    setHistoryPage,
    setHistorySearch,
    setHistoryToneFilter,
    setRenameTemplateArchived,
    setRenameTemplateCategory,
    setRenameTemplateTags,
    setRenameTemplateTitle,
    setTemplateArchiveFilter,
    setDatabaseTemplateCategoryFilter,
    setTemplateCategoryFilter,
    setTemplateSearch,
    setTemplateSort,
    startRenameTemplate,
    submitTemplateDetails,
    toggleArchiveTemplate,
    toggleCompareTemplate,
    updateCategoryManager,
    updateSelectedSavedTemplatesArchive,
  } = useTemplates({
    setError,
    setStatusMessage,
    templates,
  });

  const {
    accountStats,
    verificationStatus,
    passwordForm,
    handleChangePassword,
    handleExportAccountData,
    handleImportTemplateFile,
    handlePasswordFieldChange,
    handleRequestPasswordReset,
    refreshAccountTools,
  } = useAccountTools({
    refreshSavedTemplates,
    setError,
    setStatusMessage,
  });

  const {
    activeGenerateStep,
    activeGenerateStepIndex,
    generateButtonLabel,
    subjectInsights,
    applyTonePreset,
    handleFileChange,
    handleGenerate,
    handleGenerateBack,
    handleGenerateNext,
    handlePromptStarter,
    setToneMode,
    toggleTone,
    updateField,
  } = useEmailGeneration({
    attachment,
    brandVoice,
    form,
    generateStep,
    isGenerating,
    language,
    setActiveTemplateSection,
    setAttachment,
    setButtonProgress,
    setCompareTemplateIds,
    setEditableTemplate,
    setError,
    setForm,
    setGenerateStep,
    setGenerationProgress,
    setHistory,
    setIsGenerating,
    setSelectedTemplate,
    setStatusMessage,
    setTemplates,
    setVariationCount,
    variationCount,
    navigateToTab,
    scrollGenerateStepIntoView,
  });

  const {
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
  } = useEmailEditor({
    attachment,
    brandVoice,
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
  });

  return (
    <motion.div
      {...pageLoadMotion}
      className="min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.30),_transparent_24%),radial-gradient(circle_at_85%_10%,_rgba(14,165,233,0.22),_transparent_22%),radial-gradient(circle_at_50%_100%,_rgba(244,63,94,0.16),_transparent_30%),linear-gradient(135deg,_#fff7ed_0%,_#fffbeb_22%,_#f8fafc_48%,_#eff6ff_70%,_#eef2ff_100%)] px-3 py-4 text-slate-900 sm:px-6 sm:py-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,250,245,0.92)_100%)] shadow-[0_30px_120px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:rounded-[36px]">
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
          <div className="border-b border-slate-200/80 px-4 py-6 sm:px-10 sm:py-8">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="max-w-3xl">
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: "easeOut" }}
                  className="inline-flex max-w-full rounded-full border border-amber-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 shadow-[0_10px_30px_rgba(251,146,60,0.12)] sm:px-4 sm:text-sm sm:tracking-[0.4em]"
                >
                  AI-Powered Email Template Builder
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut", delay: 0.05 }}
                  className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl"
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
                className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-[linear-gradient(145deg,#020617_0%,#111827_42%,#0f766e_100%)] p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:rounded-[32px] sm:p-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(14,165,233,0.28)_0%,rgba(16,185,129,0.22)_52%,rgba(249,115,22,0.20)_100%)]" />
                <motion.div
                  aria-hidden="true"
                  animate={{ rotate: [0, 8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="pointer-events-none absolute -right-10 top-10 h-28 w-28 rounded-full border border-white/15 bg-white/10 blur-sm"
                />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100">Welcome To</p>
                  <h3 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                    Inbox Studio
                  </h3>
                  <p className="mt-3 max-w-sm text-base font-semibold text-white">
                    {displayName}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-slate-200">
                    Start with a prompt, tune the tone, add context, and move into the editor when your drafts are ready.
                  </p>

                  <div className="mt-6 rounded-[28px] border border-white/10 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-100">Good To See You</p>
                    <p className="mt-3 text-2xl font-semibold leading-tight text-white">
                      Welcome back, {displayName.split(" ")[0] || "Creator"}.
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      Let&apos;s shape your next email with a clear prompt, the right voice, and a draft that is ready to refine.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["Prompt", "Tone", "Context", "Edit"].map((step) => (
                        <span key={`welcome-flow-${step}`} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-200">
                          {step}
                        </span>
                      ))}
                    </div>
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

          <div className="px-4 py-5 sm:px-10 sm:py-8">
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
            {activeTab === "Generate" &&
              React.createElement(GenerateTab, {
                activeGenerateStep,
                activeGenerateStepIndex,
                activeWalkthrough,
                applyTonePreset,
                attachment,
                brandVoice,
                brandVoicePresets: BRAND_VOICE_PRESETS,
                buttonProgress,
                colorThemes: COLOR_THEMES,
                draggedSection,
                editableTemplate,
                editorSectionOrder,
                fontOptions: FONT_OPTIONS,
                form,
                formatToneList,
                generateButtonLabel,
                generateStep,
                generationProgress,
                getAttachmentExtension,
                handleCopyTemplate,
                handleDownloadTemplate,
                handleFileChange,
                handleGenerate,
                handleGenerateBack,
                handleGenerateNext,
                handleOpenGmailTemplate,
                handleOpenMailTemplate,
                handlePreviewTemplate,
                handlePromptStarter,
                handleRegenerateSection,
                handleRewrite,
                handleSaveCustomTemplate,
                isGenerating,
                language,
                languageOptions: LANGUAGE_OPTIONS,
                navigateToTab,
                onStepChange: (stepValue) => {
                  setGenerateStep(stepValue);
                  scrollGenerateStepIntoView();
                },
                promptStarters: PROMPT_STARTERS,
                previewFont,
                previewSpacing,
                previewTheme,
                reorderList,
                setAttachment,
                setBrandVoice,
                setDraggedSection,
                setEditorSectionOrder,
                setGenerateStep,
                setLanguage,
                setPreviewFont,
                setPreviewSpacing,
                setPreviewTheme,
                setToneMode,
                setVariationCount,
                setWalkthroughIndex,
                steps: GENERATE_STEPS,
                subjectInsights,
                templateCountLabel,
                templates,
                toggleTone,
                toneBlueprint: TONE_BLUEPRINT,
                toneGroups: TONE_GROUPS,
                tonePresets: TONE_PRESETS,
                toneStrategyFit: TONE_STRATEGY_FIT,
                toneStyles: TONE_STYLES,
                updateEditableTemplate,
                updateField,
                variationCount,
                variationLabels: VARIATION_LABELS,
                variationOptions: VARIATION_OPTIONS,
                walkthroughExamplesLength: WALKTHROUGH_EXAMPLES.length,
                walkthroughIndex,
              })}
            {activeTab === "Fresh Emails" &&
              React.createElement(FreshEmailsPage, {
                compareTemplateIds,
                compareTemplates,
                comparisonSummary,
                favoriteTemplateIds,
                selectedTemplate,
                templateSearch,
                templateSort,
                templates,
                visibleFreshTemplates: visibleUnsavedTemplates,
                onApplyTemplate: handleApplyTemplate,
                onClearSelectedTemplates: () => setCompareTemplateIds([]),
                onCopyTemplate: handleCopyTemplate,
                onSetTemplateSearch: setTemplateSearch,
                onSetTemplateSort: setTemplateSort,
                onStartNewPrompt: () => {
                  setGenerateStep("prompt");
                  navigateToTab("Generate");
                  scrollGenerateStepIntoView();
                },
                onToggleCompareTemplate: toggleCompareTemplate,
              })}
            {activeTab === "Template Library" &&
              React.createElement(DatabaseTemplatesPage, {
                compareTemplateIds,
                compareTemplates,
                comparisonSummary,
                databaseTemplateAccess,
                databaseTemplateCategories,
                databaseTemplateCategoryFilter,
                databaseTemplates,
                favoriteTemplateIds,
                selectedTemplate,
                templateSearch,
                templateSort,
                visibleDatabaseTemplates,
                onApplyTemplate: handleApplyTemplate,
                onClearSelectedTemplates: () => setCompareTemplateIds([]),
                onCopyTemplate: handleCopyTemplate,
                onRefreshDatabaseTemplates: refreshDatabaseTemplates,
                onSetDatabaseTemplateCategoryFilter: setDatabaseTemplateCategoryFilter,
                onSetTemplateSearch: setTemplateSearch,
                onSetTemplateSort: setTemplateSort,
                onToggleCompareTemplate: toggleCompareTemplate,
              })}
            {activeTab === "My Templates" &&
              React.createElement(TemplatesPage, {
                activeTemplateSection,
                combinedTemplates,
                compareTemplateIds,
                compareTemplates,
                comparisonSummary,
                favoriteTemplateIds,
                pendingDeleteTemplate,
                recentlyDeletedTemplates,
                categoryManager,
                manageableTemplateCategories,
                renameTemplate,
                renameTemplateArchived,
                renameTemplateCategory,
                renameTemplateTags,
                renameTemplateTitle,
                savedTemplates,
                savedTemplateCategories,
                selectedTemplate,
                selectedSavedTemplates,
                templateArchiveFilter,
                templateCategoryFilter,
                templateSearch,
                templateSort,
                templates,
                visibleSavedTemplates,
                visibleUnsavedTemplates,
                onApplyTemplate: handleApplyTemplate,
                onCopyTemplate: handleCopyTemplate,
                onCancelDeleteTemplate: cancelDeleteTemplate,
                onCancelRenameTemplate: cancelRenameTemplate,
                onConfirmDeleteTemplate: confirmDeleteTemplate,
                onConfirmDeleteSelectedSavedTemplates: confirmDeleteSelectedSavedTemplates,
                onClearArchivedTemplates: clearArchivedSavedTemplates,
                onDeleteCategory: deleteCategory,
                onDismissDeletedTemplate: dismissRecentlyDeletedTemplate,
                onDeleteTemplate: requestDeleteTemplate,
                onArchiveTemplate: toggleArchiveTemplate,
                onClearSelectedTemplates: () => setCompareTemplateIds([]),
                onRenameTemplate: startRenameTemplate,
                onRenameCategory: renameCategory,
                onRestoreDeletedTemplate: restoreRecentlyDeletedTemplate,
                onRenameArchivedChange: setRenameTemplateArchived,
                onRenameCategoryChange: setRenameTemplateCategory,
                onRenameTagsChange: setRenameTemplateTags,
                onRenameTitleChange: setRenameTemplateTitle,
                onSubmitTemplateDetails: submitTemplateDetails,
                onSetActiveTemplateSection: setActiveTemplateSection,
                onSetTemplateArchiveFilter: setTemplateArchiveFilter,
                onSetTemplateCategoryFilter: setTemplateCategoryFilter,
                onSetTemplateSearch: setTemplateSearch,
                onSetTemplateSort: setTemplateSort,
                onToggleCompareTemplate: toggleCompareTemplate,
                onToggleFavorite: handleToggleFavorite,
                onUpdateCategoryManager: updateCategoryManager,
                onUpdateSelectedSavedTemplatesArchive: updateSelectedSavedTemplatesArchive,
              })}
            {activeTab === "History" &&
              React.createElement(HistoryPage, {
                filteredHistory,
                paginatedHistory,
                history,
                historyPage,
                historyPageCount,
                historySearch,
                historyToneFilter,
                toneNames: Object.keys(TONE_STYLES),
                formatDate,
                onClearHistory: handleClearHistory,
                onDeleteHistoryItem: handleDeleteHistoryItem,
                onHistoryPageChange: setHistoryPage,
                onHistorySearchChange: setHistorySearch,
                onHistoryToneFilterChange: setHistoryToneFilter,
                onOpenHistoryItem: handleOpenHistoryItem,
              })}
            {activeTab === "Account" &&
              React.createElement(AccountPage, {
                accountStats,
                passwordForm,
                verificationStatus,
                onChangePassword: handleChangePassword,
                onExportAccountData: handleExportAccountData,
                onImportTemplateFile: handleImportTemplateFile,
                onPasswordFieldChange: handlePasswordFieldChange,
                onRequestPasswordReset: handleRequestPasswordReset,
                onRefreshAccountTools: refreshAccountTools,
              })}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default EmailBuilder;
