import { motion } from "framer-motion";
import { scrollFloatMotion, tabContentMotion } from "./motion";
import TemplateBulkActionBar from "./TemplateBulkActionBar";
import TemplateCategoryManager from "./TemplateCategoryManager";
import TemplateComparisonGuide from "./TemplateComparisonGuide";
import TemplateFilters from "./TemplateFilters";
import TemplateGrid from "./TemplateGrid";
import TemplateManagementPanels from "./TemplateManagementPanels";
import TemplateUndoBar from "./TemplateUndoBar";

const TemplatesPage = ({
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
  visibleSavedTemplates,
  onApplyTemplate,
  onCopyTemplate,
  onCancelDeleteTemplate,
  onCancelRenameTemplate,
  onConfirmDeleteTemplate,
  onConfirmDeleteSelectedSavedTemplates,
  onClearArchivedTemplates,
  onDeleteCategory,
  onDismissDeletedTemplate,
  onDeleteTemplate,
  onArchiveTemplate,
  onClearSelectedTemplates,
  onRenameTemplate,
  onRenameCategory,
  onRestoreDeletedTemplate,
  onRenameArchivedChange,
  onRenameCategoryChange,
  onRenameTagsChange,
  onRenameTitleChange,
  onSubmitTemplateDetails,
  onSetTemplateArchiveFilter,
  onSetTemplateCategoryFilter,
  onSetTemplateSearch,
  onSetTemplateSort,
  onToggleCompareTemplate,
  onToggleFavorite,
  onUpdateCategoryManager,
  onUpdateSelectedSavedTemplatesArchive,
}) => (
  <motion.div
    key="templates-tab"
    {...tabContentMotion}
    className="space-y-6"
  >
    {savedTemplates.length ? (
      <>
        <div className="flex flex-col gap-3 rounded-[22px] bg-slate-950 px-4 py-5 text-white sm:rounded-[28px] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">My Templates</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Your saved email library</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Saved emails live here after you choose a fresh draft and save it from the editor.
            </p>
          </div>
          <p className="rounded-[20px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200">
            {savedTemplates.length} saved template{savedTemplates.length === 1 ? "" : "s"}
          </p>
        </div>

        <TemplateFilters
          savedTemplateCategories={savedTemplateCategories}
          templateArchiveFilter={templateArchiveFilter}
          templateCategoryFilter={templateCategoryFilter}
          templateSearch={templateSearch}
          templateSort={templateSort}
          onSetTemplateArchiveFilter={onSetTemplateArchiveFilter}
          onSetTemplateCategoryFilter={onSetTemplateCategoryFilter}
          onSetTemplateSearch={onSetTemplateSearch}
          onSetTemplateSort={onSetTemplateSort}
        />

        <TemplateComparisonGuide
          compareTemplates={compareTemplates}
          comparisonSummary={comparisonSummary}
        />

        <TemplateBulkActionBar
          selectedSavedTemplates={selectedSavedTemplates}
          onClearSelectedTemplates={onClearSelectedTemplates}
          onConfirmDeleteSelectedSavedTemplates={onConfirmDeleteSelectedSavedTemplates}
          onUpdateSelectedSavedTemplatesArchive={onUpdateSelectedSavedTemplatesArchive}
        />
        <TemplateCategoryManager
          categoryManager={categoryManager}
          manageableTemplateCategories={manageableTemplateCategories}
          onClearArchivedTemplates={onClearArchivedTemplates}
          onDeleteCategory={onDeleteCategory}
          onRenameCategory={onRenameCategory}
          onUpdateCategoryManager={onUpdateCategoryManager}
        />
        <TemplateUndoBar
          recentlyDeletedTemplates={recentlyDeletedTemplates}
          onDismissDeletedTemplate={onDismissDeletedTemplate}
          onRestoreDeletedTemplate={onRestoreDeletedTemplate}
        />
        <TemplateManagementPanels
          pendingDeleteTemplate={pendingDeleteTemplate}
          renameTemplate={renameTemplate}
          renameTemplateArchived={renameTemplateArchived}
          renameTemplateCategory={renameTemplateCategory}
          renameTemplateTags={renameTemplateTags}
          renameTemplateTitle={renameTemplateTitle}
          onCancelDeleteTemplate={onCancelDeleteTemplate}
          onCancelRenameTemplate={onCancelRenameTemplate}
          onConfirmDeleteTemplate={onConfirmDeleteTemplate}
          onRenameArchivedChange={onRenameArchivedChange}
          onRenameCategoryChange={onRenameCategoryChange}
          onRenameTagsChange={onRenameTagsChange}
          onRenameTitleChange={onRenameTitleChange}
          onSubmitTemplateDetails={onSubmitTemplateDetails}
        />

        {visibleSavedTemplates.length ? (
          <TemplateGrid
            templates={visibleSavedTemplates}
            badgePrefix="Saved"
            selectedTemplate={selectedTemplate}
            favoriteTemplateIds={favoriteTemplateIds}
            compareTemplateIds={compareTemplateIds}
            onApply={onApplyTemplate}
            onCopy={onCopyTemplate}
            onToggleFavorite={onToggleFavorite}
            onToggleCompare={onToggleCompareTemplate}
            onRename={onRenameTemplate}
            onDelete={onDeleteTemplate}
            onArchive={onArchiveTemplate}
            showFavorite
            showManageActions
          />
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h3 className="text-xl font-semibold text-slate-900">No matching saved templates</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Try a different search term or clear the filters.
            </p>
          </div>
        )}
      </>
    ) : (
      <motion.div
        {...scrollFloatMotion}
        className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">My Templates</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">No saved templates yet</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          Fresh generated emails now have their own section. Save one from the editor when you want to keep it in this library.
        </p>
      </motion.div>
    )}
  </motion.div>
);

export default TemplatesPage;
