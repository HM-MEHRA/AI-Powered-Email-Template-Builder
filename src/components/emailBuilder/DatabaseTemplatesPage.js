import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buttonMotion, scrollFloatMotion, tabContentMotion } from "./motion";
import TemplateComparisonGuide from "./TemplateComparisonGuide";
import TemplateGrid from "./TemplateGrid";

const LIBRARY_PAGE_SIZE = 8;
const CATEGORY_ACCENTS = [
  { dot: "bg-emerald-400", ring: "ring-emerald-100", active: "from-emerald-500 to-teal-600" },
  { dot: "bg-amber-400", ring: "ring-amber-100", active: "from-amber-400 to-orange-500" },
  { dot: "bg-sky-400", ring: "ring-sky-100", active: "from-sky-500 to-blue-600" },
  { dot: "bg-rose-400", ring: "ring-rose-100", active: "from-rose-500 to-pink-600" },
  { dot: "bg-violet-400", ring: "ring-violet-100", active: "from-violet-500 to-indigo-600" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", note: "Latest additions", accent: "from-cyan-500 to-blue-600" },
  { value: "oldest", label: "Oldest first", note: "Original order", accent: "from-amber-400 to-orange-500" },
  { value: "subject", label: "Subject A-Z", note: "Alphabetical", accent: "from-violet-500 to-indigo-600" },
];

const getCategoryAccent = (category = "") => {
  const hash = category.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return CATEGORY_ACCENTS[hash % CATEGORY_ACCENTS.length];
};

const SortPicker = ({ selectedSort, onSelectSort }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const selectedOption = SORT_OPTIONS.find((option) => option.value === selectedSort) || SORT_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative z-20">
      <span className="sr-only">Sort template library</span>
      <motion.button
        type="button"
        {...buttonMotion}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="group flex h-full min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#f5f3ff_100%)] px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.07)] outline-none transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_42px_rgba(79,70,229,0.14)] focus:border-violet-300"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700">Sort</span>
          <span className="block truncate">{selectedOption.label}</span>
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br ${selectedOption.accent} shadow-[0_10px_20px_rgba(79,70,229,0.22)]`}
        >
          <span className="h-2 w-2 rotate-45 border-b-2 border-r-2 border-white" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 8, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-40 overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 backdrop-blur-xl md:right-auto md:w-64"
          >
            <div role="listbox" className="space-y-1">
              {SORT_OPTIONS.map((option) => {
                const isSelected = selectedSort === option.value;

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    whileHover={{ x: 3 }}
                    onClick={() => {
                      onSelectSort(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition ${
                      isSelected
                        ? `bg-gradient-to-r ${option.accent} text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]`
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <span className={`h-9 w-9 shrink-0 rounded-2xl ${isSelected ? "bg-white/20" : "bg-slate-100"} grid place-items-center text-xs font-black`}>
                      {option.label.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className={`mt-0.5 block text-xs ${isSelected ? "text-white/75" : "text-slate-500"}`}>
                        {option.note}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const CategoryPicker = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const activeAccent = getCategoryAccent(selectedCategory);
  const selectedLabel = selectedCategory === "All" ? "All categories" : selectedCategory;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative z-30">
      <span className="sr-only">Filter template library category</span>
      <motion.button
        type="button"
        {...buttonMotion}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="group flex h-full min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#ecfeff_100%)] px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.07)] outline-none transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_42px_rgba(14,116,144,0.14)] focus:border-cyan-300"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`h-3 w-3 shrink-0 rounded-full ${activeAccent.dot} ring-4 ${activeAccent.ring}`} />
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-700">Category</span>
            <span className="block truncate">{selectedLabel}</span>
          </span>
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 shadow-[0_10px_20px_rgba(15,23,42,0.2)]"
        >
          <span className="h-2 w-2 rotate-45 border-b-2 border-r-2 border-white" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 8, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-40 max-h-80 overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 backdrop-blur-xl md:right-auto md:w-72"
          >
            <div role="listbox" className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {categories.map((category) => {
                const accent = getCategoryAccent(category);
                const isSelected = selectedCategory === category;
                const label = category === "All" ? "All categories" : category;

                return (
                  <motion.button
                    key={category}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    whileHover={{ x: 3 }}
                    onClick={() => {
                      onSelectCategory(category);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold transition ${
                      isSelected
                        ? `bg-gradient-to-r ${accent.active} text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]`
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isSelected ? "bg-white/90" : accent.dot}`} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {isSelected ? (
                      <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                        On
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const DatabaseTemplatesPage = ({
  compareTemplates,
  comparisonSummary,
  databaseTemplateAccess,
  databaseTemplateCategories = ["All"],
  databaseTemplateCategoryFilter = "All",
  databaseTemplates,
  favoriteTemplateIds,
  compareTemplateIds,
  selectedTemplate,
  templateSearch,
  templateSort,
  visibleDatabaseTemplates,
  onApplyTemplate,
  onClearSelectedTemplates,
  onCopyTemplate,
  onRefreshDatabaseTemplates,
  onSetDatabaseTemplateCategoryFilter,
  onSetTemplateSearch,
  onSetTemplateSort,
  onToggleCompareTemplate,
}) => {
  const [libraryPage, setLibraryPage] = useState(1);
  const [jumpPageValue, setJumpPageValue] = useState("");
  const libraryResultsStartRef = useRef(null);
  const libraryPageCount = Math.max(1, Math.ceil(visibleDatabaseTemplates.length / LIBRARY_PAGE_SIZE));
  const safeLibraryPage = Math.min(libraryPage, libraryPageCount);
  const pageStart = (safeLibraryPage - 1) * LIBRARY_PAGE_SIZE;
  const paginatedDatabaseTemplates = useMemo(
    () => visibleDatabaseTemplates.slice(pageStart, pageStart + LIBRARY_PAGE_SIZE),
    [visibleDatabaseTemplates, pageStart]
  );
  const resultStart = visibleDatabaseTemplates.length ? pageStart + 1 : 0;
  const resultEnd = Math.min(pageStart + LIBRARY_PAGE_SIZE, visibleDatabaseTemplates.length);

  useEffect(() => {
    setLibraryPage(1);
  }, [templateSearch, templateSort, databaseTemplateCategoryFilter, databaseTemplates.length]);

  useEffect(() => {
    setLibraryPage((current) => Math.min(current, libraryPageCount));
  }, [libraryPageCount]);

  const changeLibraryPage = (nextPage) => {
    setLibraryPage(Math.max(1, Math.min(libraryPageCount, nextPage)));
    setJumpPageValue("");
    window.requestAnimationFrame(() => {
      libraryResultsStartRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const submitJumpPage = (event) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(jumpPageValue, 10);
    if (!Number.isFinite(requestedPage)) return;
    changeLibraryPage(requestedPage);
  };

  const renderPaginationControls = () => {
    if (!visibleDatabaseTemplates.length) return null;

    return (
      <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">
          Showing templates {resultStart}-{resultEnd}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            {...buttonMotion}
            disabled={safeLibraryPage <= 1}
            onClick={() => changeLibraryPage(safeLibraryPage - 1)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            Previous
          </motion.button>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
            Page {safeLibraryPage}
          </span>
          <motion.button
            type="button"
            {...buttonMotion}
            disabled={safeLibraryPage >= libraryPageCount}
            onClick={() => changeLibraryPage(safeLibraryPage + 1)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </motion.button>
          <form onSubmit={submitJumpPage} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="library-page-jump">Jump to page</label>
            <input
              id="library-page-jump"
              type="number"
              min="1"
              max={libraryPageCount}
              value={jumpPageValue}
              onChange={(event) => setJumpPageValue(event.target.value)}
              placeholder="Page"
              className="h-10 w-20 rounded-full border border-slate-200 bg-white px-3 text-center text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
            <motion.button
              type="submit"
              {...buttonMotion}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go
            </motion.button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      key="database-templates-tab"
      {...tabContentMotion}
      className="space-y-6"
    >
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:rounded-[28px]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#0f172a_0%,#115e59_52%,#f59e0b_100%)] px-4 py-5 text-white sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-100">Template Library</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Hundreds of ready-to-use email templates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Search the library, browse focused pages, and use the template that fits your email.
            </p>
          </div>

          <div className="grid gap-2 rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur sm:min-w-60">
            <div className="flex items-center justify-between gap-3 text-slate-100">
              <span>Templates</span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </div>

      {databaseTemplates.length ? (
        <>
          <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.04)] md:grid-cols-[1fr_180px_180px_auto]">
            <label className="block">
              <span className="sr-only">Search template library</span>
              <input
                type="search"
                value={templateSearch}
                onChange={(event) => onSetTemplateSearch(event.target.value)}
                placeholder="Search subject, body, category, or tags"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </label>
            <CategoryPicker
              categories={databaseTemplateCategories}
              selectedCategory={databaseTemplateCategoryFilter}
              onSelectCategory={onSetDatabaseTemplateCategoryFilter}
            />
            <SortPicker
              selectedSort={templateSort}
              onSelectSort={onSetTemplateSort}
            />
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={onRefreshDatabaseTemplates}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Refresh
            </motion.button>
          </div>

          <div ref={libraryResultsStartRef} className="scroll-mt-6" />
          {renderPaginationControls()}

          {compareTemplates.length ? (
            <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {compareTemplates.length} email{compareTemplates.length === 1 ? "" : "s"} selected for comparison
              </p>
              <motion.button
                type="button"
                {...buttonMotion}
                onClick={onClearSelectedTemplates}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear Comparison
              </motion.button>
            </div>
          ) : null}

          <TemplateComparisonGuide
            compareTemplates={compareTemplates}
            comparisonSummary={comparisonSummary}
          />

          {visibleDatabaseTemplates.length ? (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`library-page-${safeLibraryPage}-${templateSearch}-${databaseTemplateCategoryFilter}-${templateSort}`}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                >
                  <TemplateGrid
                    templates={paginatedDatabaseTemplates}
                    badgePrefix="Library"
                    selectedTemplate={selectedTemplate}
                    favoriteTemplateIds={favoriteTemplateIds}
                    compareTemplateIds={compareTemplateIds}
                    onApply={onApplyTemplate}
                    onCopy={onCopyTemplate}
                    onToggleFavorite={() => {}}
                    onToggleCompare={onToggleCompareTemplate}
                  />
                </motion.div>
              </AnimatePresence>
              {renderPaginationControls()}
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <h3 className="text-xl font-semibold text-slate-900">No matching library templates</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Try a different search term, switch category, or clear the search box.
              </p>
            </div>
          )}
        </>
      ) : (
        <motion.div
          {...scrollFloatMotion}
          className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">Template Library</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">No library templates yet</h2>
          <motion.button
            type="button"
            {...buttonMotion}
            onClick={onRefreshDatabaseTemplates}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Refresh Library
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DatabaseTemplatesPage;
