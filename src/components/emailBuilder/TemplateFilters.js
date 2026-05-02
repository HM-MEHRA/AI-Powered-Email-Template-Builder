const TemplateFilters = ({
  savedTemplateCategories,
  templateArchiveFilter,
  templateCategoryFilter,
  templateSearch,
  templateSort,
  onSetTemplateArchiveFilter,
  onSetTemplateCategoryFilter,
  onSetTemplateSearch,
  onSetTemplateSort,
}) => (
  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px_180px]">
    <label className="block">
      <span className="sr-only">Search templates</span>
      <input
        type="search"
        value={templateSearch}
        onChange={(event) => onSetTemplateSearch(event.target.value)}
        placeholder="Search subject, body, category, or tags"
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
      />
    </label>
    <label className="block">
      <span className="sr-only">Filter category</span>
      <select
        value={templateCategoryFilter}
        onChange={(event) => onSetTemplateCategoryFilter(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
      >
        {savedTemplateCategories.map((category) => (
          <option key={category} value={category}>{category === "All" ? "All categories" : category}</option>
        ))}
      </select>
    </label>
    <label className="block">
      <span className="sr-only">Archive filter</span>
      <select
        value={templateArchiveFilter}
        onChange={(event) => onSetTemplateArchiveFilter(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white"
      >
        <option value="active">Active only</option>
        <option value="archived">Archived only</option>
        <option value="all">All statuses</option>
      </select>
    </label>
    <label className="block">
      <span className="sr-only">Sort templates</span>
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
  </div>
);

export default TemplateFilters;
