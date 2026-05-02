const TemplateUndoBar = ({
  recentlyDeletedTemplates,
  onDismissDeletedTemplate,
  onRestoreDeletedTemplate,
}) => {
  if (!recentlyDeletedTemplates.length) return null;

  return (
    <div className="space-y-2 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_18px_45px_rgba(16,185,129,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">Undo Delete</p>
      {recentlyDeletedTemplates.map((template) => (
        <div key={`deleted-${template.id}`} className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
            {template.subject || "Deleted template"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRestoreDeletedTemplate(template)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => onDismissDeletedTemplate(template.id)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateUndoBar;
