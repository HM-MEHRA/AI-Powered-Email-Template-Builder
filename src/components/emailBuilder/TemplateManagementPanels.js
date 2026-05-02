const TemplateManagementPanels = ({
  pendingDeleteTemplate,
  renameTemplate,
  renameTemplateArchived,
  renameTemplateCategory,
  renameTemplateTags,
  renameTemplateTitle,
  onCancelDeleteTemplate,
  onCancelRenameTemplate,
  onConfirmDeleteTemplate,
  onRenameArchivedChange,
  onRenameCategoryChange,
  onRenameTagsChange,
  onRenameTitleChange,
  onSubmitTemplateDetails,
}) => (
  <>
    {renameTemplate && (
      <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 shadow-[0_18px_45px_rgba(14,165,233,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Edit Template Details</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_1fr_auto_auto] xl:items-center">
          <input
            type="text"
            value={renameTemplateTitle}
            onChange={(event) => onRenameTitleChange(event.target.value)}
            className="min-w-0 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-400"
            aria-label="Template name"
          />
          <input
            type="text"
            value={renameTemplateCategory}
            onChange={(event) => onRenameCategoryChange(event.target.value)}
            className="min-w-0 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-400"
            aria-label="Template category"
            placeholder="Category"
          />
          <input
            type="text"
            value={renameTemplateTags}
            onChange={(event) => onRenameTagsChange(event.target.value)}
            className="min-w-0 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-400"
            aria-label="Template tags"
            placeholder="Tags, separated by commas"
          />
          <button
            type="button"
            onClick={onCancelRenameTemplate}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 md:w-full xl:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitTemplateDetails}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white md:w-full xl:w-auto"
          >
            Save
          </button>
        </div>
        <label className="mt-3 flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-900">
          <input
            type="checkbox"
            checked={renameTemplateArchived}
            onChange={(event) => onRenameArchivedChange(event.target.checked)}
          />
          Archived
        </label>
      </div>
    )}

    {pendingDeleteTemplate && (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 shadow-[0_18px_45px_rgba(244,63,94,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-700">Confirm Delete</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-rose-900">
            Delete <span className="font-semibold">{pendingDeleteTemplate.subject || "this template"}</span> from your saved library?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancelDeleteTemplate}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Keep It
            </button>
            <button
              type="button"
              onClick={onConfirmDeleteTemplate}
              className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default TemplateManagementPanels;
