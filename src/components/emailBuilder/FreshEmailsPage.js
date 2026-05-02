import { motion } from "framer-motion";
import { buttonMotion, scrollFloatMotion, tabContentMotion } from "./motion";
import TemplateComparisonGuide from "./TemplateComparisonGuide";
import TemplateGrid from "./TemplateGrid";

const FreshEmailsPage = ({
  compareTemplates,
  compareTemplateIds,
  comparisonSummary,
  favoriteTemplateIds,
  selectedTemplate,
  templateSearch,
  templateSort,
  templates,
  visibleFreshTemplates,
  onApplyTemplate,
  onClearSelectedTemplates,
  onCopyTemplate,
  onSetTemplateSearch,
  onSetTemplateSort,
  onStartNewPrompt,
  onToggleCompareTemplate,
}) => (
  <motion.div
    key="fresh-emails-tab"
    {...tabContentMotion}
    className="space-y-6"
  >
    {templates.length ? (
      <>
        <div className="flex flex-col gap-4 rounded-[22px] bg-[linear-gradient(135deg,#0f172a_0%,#164e63_56%,#f97316_100%)] px-4 py-5 text-white shadow-[0_22px_65px_rgba(15,23,42,0.16)] sm:rounded-[28px] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-100">Fresh Emails</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
              Generated emails from your latest prompt
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              These are temporary fresh drafts. Use one in the editor, copy it, compare versions, or save it from the editor when it is ready.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur">
            {templates.length} fresh email{templates.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:grid-cols-[1fr_180px_auto]">
          <label className="block">
            <span className="sr-only">Search fresh emails</span>
            <input
              type="search"
              value={templateSearch}
              onChange={(event) => onSetTemplateSearch(event.target.value)}
              placeholder="Search generated subject or body"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            />
          </label>
          <label className="block">
            <span className="sr-only">Sort fresh emails</span>
            <select
              value={templateSort}
              onChange={(event) => onSetTemplateSort(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="subject">Subject A-Z</option>
            </select>
          </label>
          <motion.button
            type="button"
            {...buttonMotion}
            onClick={onStartNewPrompt}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Email
          </motion.button>
        </div>

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

        {visibleFreshTemplates.length ? (
          <TemplateGrid
            templates={visibleFreshTemplates}
            badgePrefix="Fresh"
            selectedTemplate={selectedTemplate}
            favoriteTemplateIds={favoriteTemplateIds}
            compareTemplateIds={compareTemplateIds}
            onApply={onApplyTemplate}
            onCopy={onCopyTemplate}
            onToggleFavorite={() => {}}
            onToggleCompare={onToggleCompareTemplate}
          />
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h3 className="text-xl font-semibold text-slate-900">No matching fresh emails</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Try a different search term or clear the search box.
            </p>
          </div>
        )}
      </>
    ) : (
      <motion.div
        {...scrollFloatMotion}
        className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">Fresh Emails</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">No generated emails yet</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Generate a new email and it will appear here first, separate from your saved template library.
        </p>
        <motion.button
          type="button"
          {...buttonMotion}
          onClick={onStartNewPrompt}
          className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Start New Email
        </motion.button>
      </motion.div>
    )}
  </motion.div>
);

export default FreshEmailsPage;
