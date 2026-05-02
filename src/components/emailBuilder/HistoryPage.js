import { motion } from "framer-motion";
import { buttonMotion, scrollRevealMotion, tabContentMotion } from "./motion";

const HistoryPage = ({
  filteredHistory,
  paginatedHistory,
  history,
  historyPage,
  historyPageCount,
  historySearch,
  historyToneFilter,
  toneNames,
  formatDate,
  onClearHistory,
  onDeleteHistoryItem,
  onHistoryPageChange,
  onHistorySearchChange,
  onHistoryToneFilterChange,
  onOpenHistoryItem,
}) => {
  const visibleHistory = paginatedHistory || filteredHistory;

  return (
    <motion.div
      key="history-tab"
      {...tabContentMotion}
      className="space-y-5"
    >
      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">History</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">Reopen previous generation runs</h2>
            <p className="mt-2 text-sm text-slate-600">
              {filteredHistory.length} matching {filteredHistory.length === 1 ? "run" : "runs"} from {history.length} total.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearHistory}
            disabled={!history.length}
            className="w-full rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            Clear History
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="text"
            value={historySearch}
            onChange={(event) => onHistorySearchChange(event.target.value)}
            placeholder="Search history by subject or purpose"
            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
          />
          <select
            value={historyToneFilter}
            onChange={(event) => onHistoryToneFilterChange(event.target.value)}
            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
          >
            <option value="All">All tones</option>
            {toneNames.map((tone) => (
              <option key={tone} value={tone}>{tone}</option>
            ))}
          </select>
        </div>
      </div>
    {filteredHistory.length ? (
      <>
      {visibleHistory.map((item) => (
        <motion.article
          key={item.id}
          initial={{ opacity: 0, y: 36, scale: 0.985, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="block w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                {formatDate(item.createdAt)}
              </p>
              <h3 className="mt-2 break-words text-xl font-semibold text-slate-900 sm:text-2xl">{item.subject}</h3>
              <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-slate-600">{item.purpose}</p>
            </div>
            <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 lg:w-64">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Tone</p>
              <p className="mt-1 break-words text-sm font-medium text-slate-900">{item.tone}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.variations?.length || 0} draft {(item.variations?.length || 0) === 1 ? "variation" : "variations"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <motion.button
                  type="button"
                  {...buttonMotion}
                  onClick={() => onOpenHistoryItem(item)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open
                </motion.button>
                <motion.button
                  type="button"
                  {...buttonMotion}
                  onClick={() => onDeleteHistoryItem(item.id)}
                  className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </div>
        </motion.article>
      ))
      }
      {historyPageCount > 1 && (
        <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="px-2 text-sm font-semibold text-slate-600">
            Page {historyPage} of {historyPageCount}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => onHistoryPageChange(Math.max(1, historyPage - 1))}
              disabled={historyPage <= 1}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onHistoryPageChange(Math.min(historyPageCount, historyPage + 1))}
              disabled={historyPage >= historyPageCount}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </>
    ) : (
      <motion.div
        {...scrollRevealMotion}
        className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
      >
        <h2 className="text-2xl font-semibold text-slate-900">{history.length ? "No matching history items" : "History is empty"}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          {history.length
            ? "Try a different search or tone filter."
            : "Generated email sets will appear here automatically so you can reopen past drafts without losing them."}
        </p>
      </motion.div>
    )}
    </motion.div>
  );
};

export default HistoryPage;
