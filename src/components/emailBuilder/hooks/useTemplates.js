import { useEffect, useMemo, useState } from "react";
import {
  clearEmailHistory,
  clearArchivedTemplates,
  deleteHistoryItem,
  deleteSavedTemplate,
  fetchDatabaseTemplates,
  favoriteTemplate,
  fetchEmailHistory,
  fetchSavedTemplates,
  isAuthenticated,
  restoreSavedTemplate,
  unfavoriteTemplate,
  updateAccountCategory,
  updateSavedTemplate,
} from "../../../services/ai";
import {
  buildComparisonSummary,
  filterAndSortTemplates,
  mapApiTemplateToEditorTemplate,
} from "../builderUtils";

const HISTORY_PAGE_SIZE = 5;
const EMPTY_DATABASE_TEMPLATE_ACCESS = {
  plan: "free",
  hasFullAccess: false,
  freeLimit: 0,
  visibleCount: 0,
  totalCount: 0,
  freeCount: 0,
  premiumCount: 0,
};

const normalizeDatabaseTemplateAccess = (access = {}) => ({
  plan: access.plan || "free",
  hasFullAccess: Boolean(access.has_full_access),
  freeLimit: Number(access.free_limit || 0),
  visibleCount: Number(access.visible_count || 0),
  totalCount: Number(access.total_count || 0),
  freeCount: Number(access.free_count || 0),
  premiumCount: Number(access.premium_count || 0),
});

const useTemplates = ({
  setError,
  setStatusMessage,
  templates,
}) => {
  const [history, setHistory] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [databaseTemplates, setDatabaseTemplates] = useState([]);
  const [databaseTemplateAccess, setDatabaseTemplateAccess] = useState(EMPTY_DATABASE_TEMPLATE_ACCESS);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyToneFilter, setHistoryToneFilter] = useState("All");
  const [compareTemplateIds, setCompareTemplateIds] = useState([]);
  const [activeTemplateSection, setActiveTemplateSection] = useState("unsaved");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateSort, setTemplateSort] = useState("newest");
  const [databaseTemplateCategoryFilter, setDatabaseTemplateCategoryFilter] = useState("All");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("All");
  const [templateArchiveFilter, setTemplateArchiveFilter] = useState("active");
  const [historyPage, setHistoryPage] = useState(1);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);
  const [recentlyDeletedTemplates, setRecentlyDeletedTemplates] = useState([]);
  const [renameTemplate, setRenameTemplate] = useState(null);
  const [renameTemplateTitle, setRenameTemplateTitle] = useState("");
  const [renameTemplateCategory, setRenameTemplateCategory] = useState("General");
  const [renameTemplateTags, setRenameTemplateTags] = useState("");
  const [renameTemplateArchived, setRenameTemplateArchived] = useState(false);
  const [categoryManager, setCategoryManager] = useState({
    source: "General",
    target: "",
  });

  const refreshSavedTemplates = async () => {
    if (!isAuthenticated()) {
      setSavedTemplates([]);
      setFavoriteTemplateIds([]);
      return;
    }

    const templatesResult = await fetchSavedTemplates();
    if (templatesResult?.error) {
      setError(templatesResult.error);
      return;
    }

    const mappedTemplates = (templatesResult || []).map(mapApiTemplateToEditorTemplate);
    setSavedTemplates(mappedTemplates);
    setFavoriteTemplateIds(mappedTemplates.filter((template) => template.isFavorite).map((template) => template.id));
  };

  const refreshDatabaseTemplates = async () => {
    if (!isAuthenticated()) {
      setDatabaseTemplates([]);
      setDatabaseTemplateAccess(EMPTY_DATABASE_TEMPLATE_ACCESS);
      return;
    }

    const result = await fetchDatabaseTemplates();
    if (result?.error) {
      setError(result.error);
      return;
    }

    setDatabaseTemplates((result.templates || []).map(mapApiTemplateToEditorTemplate));
    setDatabaseTemplateAccess(normalizeDatabaseTemplateAccess(result.access));
  };

  useEffect(() => {
    const loadAccountData = async () => {
      if (!isAuthenticated()) {
        setHistory([]);
        setSavedTemplates([]);
        setDatabaseTemplates([]);
        setDatabaseTemplateAccess(EMPTY_DATABASE_TEMPLATE_ACCESS);
        setFavoriteTemplateIds([]);
        return;
      }

      const [historyResult, templatesResult, databaseTemplatesResult] = await Promise.all([
        fetchEmailHistory(),
        fetchSavedTemplates(),
        fetchDatabaseTemplates(),
      ]);

      if (historyResult?.error) {
        setError(historyResult.error);
      } else {
        setHistory(historyResult || []);
      }

      if (templatesResult?.error) {
        setError(templatesResult.error);
      } else {
        const mappedTemplates = (templatesResult || []).map(mapApiTemplateToEditorTemplate);
        setSavedTemplates(mappedTemplates);
        setFavoriteTemplateIds(mappedTemplates.filter((template) => template.isFavorite).map((template) => template.id));
      }

      if (databaseTemplatesResult?.error) {
        setError(databaseTemplatesResult.error);
      } else {
        setDatabaseTemplates((databaseTemplatesResult?.templates || []).map(mapApiTemplateToEditorTemplate));
        setDatabaseTemplateAccess(normalizeDatabaseTemplateAccess(databaseTemplatesResult?.access));
      }
    };

    loadAccountData();
  }, [setError]);

  const templateCountLabel = useMemo(() => {
    if (!templates.length) return "No fresh emails yet";
    return `${templates.length} fresh email${templates.length === 1 ? "" : "s"} ready`;
  }, [templates]);

  const combinedTemplates = useMemo(
    () => [...databaseTemplates, ...savedTemplates, ...templates],
    [databaseTemplates, savedTemplates, templates]
  );
  const visibleDatabaseTemplates = useMemo(
    () =>
      filterAndSortTemplates(databaseTemplates, templateSearch, templateSort).filter((template) =>
        databaseTemplateCategoryFilter === "All" || template.category === databaseTemplateCategoryFilter
      ),
    [databaseTemplates, templateSearch, templateSort, databaseTemplateCategoryFilter]
  );
  const visibleUnsavedTemplates = useMemo(
    () => filterAndSortTemplates(templates, templateSearch, templateSort),
    [templates, templateSearch, templateSort]
  );
  const visibleSavedTemplates = useMemo(
    () =>
      filterAndSortTemplates(savedTemplates, templateSearch, templateSort).filter((template) => {
        const matchesCategory = templateCategoryFilter === "All" || template.category === templateCategoryFilter;
        const matchesArchive =
          templateArchiveFilter === "all" ||
          (templateArchiveFilter === "archived" ? template.isArchived : !template.isArchived);
        return matchesCategory && matchesArchive;
      }),
    [savedTemplates, templateSearch, templateSort, templateCategoryFilter, templateArchiveFilter]
  );
  const savedTemplateCategories = useMemo(
    () => ["All", ...Array.from(new Set(savedTemplates.map((template) => template.category || "General"))).sort()],
    [savedTemplates]
  );
  const databaseTemplateCategories = useMemo(
    () => ["All", ...Array.from(new Set(databaseTemplates.map((template) => template.category || "General"))).sort()],
    [databaseTemplates]
  );
  const manageableTemplateCategories = useMemo(
    () => savedTemplateCategories.filter((category) => category !== "All"),
    [savedTemplateCategories]
  );

  useEffect(() => {
    if (!manageableTemplateCategories.length) return;
    setCategoryManager((current) =>
      manageableTemplateCategories.includes(current.source)
        ? current
        : { ...current, source: manageableTemplateCategories[0] }
    );
  }, [manageableTemplateCategories]);

  useEffect(() => {
    setDatabaseTemplateCategoryFilter((current) =>
      databaseTemplateCategories.includes(current) ? current : "All"
    );
  }, [databaseTemplateCategories]);
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        !historySearch ||
        item.subject.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.purpose.toLowerCase().includes(historySearch.toLowerCase());
      const matchesTone = historyToneFilter === "All" || item.tone.includes(historyToneFilter);
      return matchesSearch && matchesTone;
    });
  }, [history, historySearch, historyToneFilter]);
  const historyPageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE)),
    [filteredHistory.length]
  );
  const paginatedHistory = useMemo(() => {
    const safePage = Math.min(historyPage, historyPageCount);
    const start = (safePage - 1) * HISTORY_PAGE_SIZE;
    return filteredHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredHistory, historyPage, historyPageCount]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyToneFilter]);

  useEffect(() => {
    setHistoryPage((current) => Math.min(current, historyPageCount));
  }, [historyPageCount]);
  const compareTemplates = useMemo(
    () => combinedTemplates.filter((template) => compareTemplateIds.includes(template.id)),
    [combinedTemplates, compareTemplateIds]
  );
  const selectedSavedTemplates = useMemo(
    () => savedTemplates.filter((template) => compareTemplateIds.includes(template.id)),
    [savedTemplates, compareTemplateIds]
  );
  const comparisonSummary = useMemo(
    () => buildComparisonSummary(compareTemplates),
    [compareTemplates]
  );

  const handleToggleFavorite = (templateId) => {
    if (!isAuthenticated()) {
      setError("Log in to manage favorites.");
      return;
    }
    if (typeof templateId !== "number") {
      setError("Save the template first before adding it to favorites.");
      return;
    }
    const toggleFavorite = async () => {
      const isFavorite = favoriteTemplateIds.includes(templateId);
      const result = isFavorite ? await unfavoriteTemplate(templateId) : await favoriteTemplate(templateId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await refreshSavedTemplates();
      setStatusMessage(isFavorite ? "Removed from favorites." : "Added to favorites.");
    };
    toggleFavorite();
  };

  const toggleCompareTemplate = (template) => {
    setCompareTemplateIds((current) =>
      current.includes(template.id)
        ? current.filter((id) => id !== template.id)
        : current.length < 4
          ? [...current, template.id]
          : [...current.slice(1), template.id]
    );
  };

  const startRenameTemplate = (template) => {
    if (!template || typeof template.id !== "number") return;
    setRenameTemplate(template);
    setRenameTemplateTitle(template.subject || "");
    setRenameTemplateCategory(template.category || "General");
    setRenameTemplateTags((template.tags || []).join(", "));
    setRenameTemplateArchived(Boolean(template.isArchived));
    setPendingDeleteTemplate(null);
  };

  const cancelRenameTemplate = () => {
    setRenameTemplate(null);
    setRenameTemplateTitle("");
    setRenameTemplateCategory("General");
    setRenameTemplateTags("");
    setRenameTemplateArchived(false);
  };

  const submitTemplateDetails = async () => {
    const nextTitle = renameTemplateTitle.trim();
    if (!renameTemplate || !nextTitle) {
      setError("Add a template name before saving.");
      return;
    }
    const tagList = String(renameTemplateTags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const result = await updateSavedTemplate(renameTemplate.id, {
      title: nextTitle,
      category: renameTemplateCategory.trim() || "General",
      tags: tagList,
      is_archived: renameTemplateArchived,
    });
    if (result?.error) {
      setError(result.error);
      return;
    }
    await refreshSavedTemplates();
    setStatusMessage("Template details updated.");
    cancelRenameTemplate();
  };

  const requestDeleteTemplate = (template) => {
    if (!template || typeof template.id !== "number") return;
    setPendingDeleteTemplate(template);
    cancelRenameTemplate();
  };

  const toggleArchiveTemplate = async (template) => {
    if (!template || typeof template.id !== "number") return;
    const result = await updateSavedTemplate(template.id, { is_archived: !template.isArchived });
    if (result?.error) {
      setError(result.error);
      return;
    }
    await refreshSavedTemplates();
    setStatusMessage(template.isArchived ? "Template restored." : "Template archived.");
  };

  const updateSelectedSavedTemplatesArchive = async (isArchived) => {
    if (!selectedSavedTemplates.length) {
      setError("Select saved templates first.");
      return;
    }

    const results = await Promise.all(
      selectedSavedTemplates.map((template) => updateSavedTemplate(template.id, { is_archived: isArchived }))
    );
    const failedResult = results.find((result) => result?.error);
    if (failedResult) {
      setError(failedResult.error);
      return;
    }

    await refreshSavedTemplates();
    setStatusMessage(`${selectedSavedTemplates.length} template${selectedSavedTemplates.length === 1 ? "" : "s"} ${isArchived ? "archived" : "restored"}.`);
  };

  const updateCategoryManager = (field, value) => {
    setCategoryManager((current) => ({ ...current, [field]: value }));
  };

  const renameCategory = async () => {
    const source = categoryManager.source;
    const target = categoryManager.target.trim();
    if (!source || source === "All") {
      setError("Choose a category to rename.");
      return;
    }
    if (!target) {
      setError("Add the new category name.");
      return;
    }
    if (source === target) {
      setError("Choose a different category name.");
      return;
    }

    const result = await updateAccountCategory({
      action: "rename",
      fromCategory: source,
      toCategory: target,
    });
    if (result?.error) {
      setError(result.error);
      return;
    }

    await refreshSavedTemplates();
    setTemplateCategoryFilter(target);
    setCategoryManager({ source: target, target: "" });
    setStatusMessage(`Renamed ${source} to ${target}.`);
  };

  const deleteCategory = async () => {
    const source = categoryManager.source;
    if (!source || source === "All") {
      setError("Choose a category to remove.");
      return;
    }
    if (!window.confirm(`Remove category "${source}" and move those templates to General?`)) return;

    const result = await updateAccountCategory({
      action: "delete",
      fromCategory: source,
      toCategory: "General",
    });
    if (result?.error) {
      setError(result.error);
      return;
    }

    await refreshSavedTemplates();
    setTemplateCategoryFilter("All");
    setCategoryManager({ source: "General", target: "" });
    setStatusMessage(`Removed ${source}. Templates moved to General.`);
  };

  const cancelDeleteTemplate = () => {
    setPendingDeleteTemplate(null);
  };

  const confirmDeleteTemplate = async () => {
    if (!pendingDeleteTemplate) return;
    const result = await deleteSavedTemplate(pendingDeleteTemplate.id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    const deletedTemplate = pendingDeleteTemplate;
    setPendingDeleteTemplate(null);
    setCompareTemplateIds((current) => current.filter((id) => id !== pendingDeleteTemplate.id));
    await refreshSavedTemplates();
    setRecentlyDeletedTemplates((current) => [deletedTemplate, ...current].slice(0, 4));
    setStatusMessage("Template deleted.");
  };

  const confirmDeleteSelectedSavedTemplates = async () => {
    if (!selectedSavedTemplates.length) {
      setError("Select saved templates first.");
      return;
    }
    if (!window.confirm(`Delete ${selectedSavedTemplates.length} selected saved template${selectedSavedTemplates.length === 1 ? "" : "s"}?`)) {
      return;
    }

    const selectedIds = selectedSavedTemplates.map((template) => template.id);
    const deletedTemplates = [...selectedSavedTemplates];
    const results = await Promise.all(selectedIds.map((templateId) => deleteSavedTemplate(templateId)));
    const failedResult = results.find((result) => result?.error);
    if (failedResult) {
      setError(failedResult.error);
      return;
    }

    setCompareTemplateIds((current) => current.filter((id) => !selectedIds.includes(id)));
    await refreshSavedTemplates();
    setRecentlyDeletedTemplates((current) => [...deletedTemplates, ...current].slice(0, 4));
    setStatusMessage(`${selectedIds.length} template${selectedIds.length === 1 ? "" : "s"} deleted.`);
  };

  const restoreRecentlyDeletedTemplate = async (template) => {
    if (!template?.id) return;
    const result = await restoreSavedTemplate(template.id);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setRecentlyDeletedTemplates((current) => current.filter((item) => item.id !== template.id));
    await refreshSavedTemplates();
    setStatusMessage("Template restored.");
  };

  const dismissRecentlyDeletedTemplate = (templateId) => {
    setRecentlyDeletedTemplates((current) => current.filter((item) => item.id !== templateId));
  };

  const clearArchivedSavedTemplates = async () => {
    if (!window.confirm("Clear all archived templates from the active library?")) return;
    const result = await clearArchivedTemplates();
    if (result?.error) {
      setError(result.error);
      return;
    }
    await refreshSavedTemplates();
    setStatusMessage(`Cleared ${result.deleted || 0} archived template${result.deleted === 1 ? "" : "s"}.`);
  };

  const handleDeleteHistoryItem = async (historyId) => {
    const result = await deleteHistoryItem(historyId);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setHistory((current) => current.filter((item) => item.id !== historyId));
    setStatusMessage("History item deleted.");
  };

  const handleClearHistory = async () => {
    if (!history.length) return;
    if (!window.confirm("Clear all generation history? This keeps saved templates.")) return;
    const result = await clearEmailHistory();
    if (result?.error) {
      setError(result.error);
      return;
    }
    setHistory([]);
    setHistoryPage(1);
    setStatusMessage("History cleared.");
  };

  return {
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
    setRenameTemplateTitle,
    setRenameTemplateArchived,
    setRenameTemplateCategory,
    setRenameTemplateTags,
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
  };
};

export default useTemplates;
