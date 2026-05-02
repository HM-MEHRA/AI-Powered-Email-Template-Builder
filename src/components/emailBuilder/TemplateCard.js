
import { motion } from "framer-motion";
import { buttonMotion, templateCardMotion } from "./motion";

const TemplateCard = ({
  template,
  index,
  badgeLabel,
  isSelected,
  onApply,
  onCopy,
  quickActions,
  stripAttachmentNotes,
}) => {
  const cleanText = stripAttachmentNotes || ((value = "") => value || "");
  const showAccessTierLabel = false;
  const accessTierLabel = showAccessTierLabel && template.accessTier === "premium"
    ? "Premium"
    : showAccessTierLabel && template.accessTier === "free"
      ? "Starter"
      : "";

  return (
    <motion.article
      variants={templateCardMotion}
      whileHover={{ y: -3, scale: 1.004, boxShadow: "0 32px 80px rgba(15,23,42,0.16)" }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="relative z-0 flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-amber-300 bg-[linear-gradient(180deg,rgba(255,247,237,0.92)_0%,rgba(255,251,235,0.86)_100%)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:z-10 sm:rounded-[28px] sm:p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(249,115,22,0.20)_0%,rgba(250,204,21,0.12)_48%,rgba(255,255,255,0)_100%)]" />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 12, 0], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute right-5 top-5 h-16 w-16 rounded-full bg-amber-300/35 blur-xl"
      />
      <div className="relative flex min-w-0 flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:text-[11px] sm:tracking-[0.3em]">
            {badgeLabel || `Variation ${index + 1}`}
          </div>
          <h3 className="mt-2 break-words text-lg font-semibold text-slate-900 sm:text-xl">{template.subject}</h3>
          {(template.category || template.tags?.length || template.isArchived || accessTierLabel) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {accessTierLabel && (
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  template.accessTier === "premium"
                    ? "border-amber-300 bg-amber-100 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}>
                  {accessTierLabel}
                </span>
              )}
              {template.category && (
                <span className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  {template.category}
                </span>
              )}
              {(template.tags || []).slice(0, 3).map((tag) => (
                <span key={`${template.id || template.subject}-tag-${tag}`} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
              {template.isArchived && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                  Archived
                </span>
              )}
            </div>
          )}
          {isSelected && (
            <p className="mt-2 text-sm font-medium text-amber-800">Selected for editing and export</p>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
          className="flex min-w-0 w-full flex-col gap-2 sm:w-auto"
        >
          <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 sm:gap-3">
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => onCopy(template)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
              Copy
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => onApply(template)}
              className="rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_62%,#f97316_100%)] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_26px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
            >
              Use This
            </motion.button>
          </div>
          {quickActions ? (
            <div className="flex min-w-0 flex-wrap justify-start gap-2 sm:justify-end">
              {quickActions}
            </div>
          ) : null}
        </motion.div>
      </div>

      <div className="relative mt-5 grid min-w-0 flex-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Subject</p>
          <p className="mt-2 break-words text-sm text-slate-800">{template.subject}</p>
        </section>
        <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Greeting</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{cleanText(template.greeting)}</p>
        </section>
        <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Body</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{cleanText(template.body)}</p>
        </section>
        <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Closing</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{cleanText(template.closing)}</p>
        </section>
        <section className="rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Signature</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{cleanText(template.signature)}</p>
        </section>
      </div>
    </motion.article>
  );
};

export default TemplateCard;
