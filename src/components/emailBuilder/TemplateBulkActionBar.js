const TemplateBulkActionBar = ({
  selectedSavedTemplates,
  onClearSelectedTemplates,
  onConfirmDeleteSelectedSavedTemplates,
  onUpdateSelectedSavedTemplatesArchive,
}) => {
  if (!selectedSavedTemplates.length) return null;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Selected</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {selectedSavedTemplates.length} saved template{selectedSavedTemplates.length === 1 ? "" : "s"} ready for action
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <button
            type="button"
            onClick={() => onUpdateSelectedSavedTemplatesArchive(true)}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => onUpdateSelectedSavedTemplatesArchive(false)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onClearSelectedTemplates}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onConfirmDeleteSelectedSavedTemplates}
            className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateBulkActionBar;
