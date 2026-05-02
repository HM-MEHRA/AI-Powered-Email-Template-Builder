const TemplateCategoryManager = ({
  categoryManager,
  manageableTemplateCategories,
  onClearArchivedTemplates,
  onDeleteCategory,
  onRenameCategory,
  onUpdateCategoryManager,
}) => {
  if (!manageableTemplateCategories.length) return null;

  return (
    <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96)_0%,rgba(255,255,255,0.98)_100%)] p-4 shadow-[0_18px_45px_rgba(245,158,11,0.08)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-700">Category Manager</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Rename a saved-template category or remove it by moving its templates back to General.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[180px_220px_auto_auto]">
          <label className="block">
            <span className="sr-only">Category to manage</span>
            <select
              value={categoryManager.source}
              onChange={(event) => onUpdateCategoryManager("source", event.target.value)}
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400"
            >
              {manageableTemplateCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">New category name</span>
            <input
              type="text"
              value={categoryManager.target}
              onChange={(event) => onUpdateCategoryManager("target", event.target.value)}
              placeholder="New category name"
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
            />
          </label>
          <button
            type="button"
            onClick={onRenameCategory}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={onDeleteCategory}
            className="rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-700"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-orange-200 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">
          Clear archived templates from the active library when you are done with them.
        </p>
        <button
          type="button"
          onClick={onClearArchivedTemplates}
          className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Clear Archived
        </button>
      </div>
    </div>
  );
};

export default TemplateCategoryManager;
