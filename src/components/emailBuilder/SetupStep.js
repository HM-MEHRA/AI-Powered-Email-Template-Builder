import { motion } from "framer-motion";
import { buttonMotion, progressItemMotion, stepPanelMotion } from "./motion";

const SetupStep = ({
  attachment,
  buttonProgress,
  form,
  formatToneList,
  generateButtonLabel,
  generationProgress,
  getAttachmentExtension,
  handleFileChange,
  isGenerating,
  language,
  setAttachment,
  setVariationCount,
  variationCount,
  variationLabels,
  variationOptions,
}) => (
  <motion.div key="setup-step-panel" {...stepPanelMotion}>
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(145deg,rgba(240,249,255,0.96)_0%,rgba(255,255,255,0.98)_48%,rgba(236,253,245,0.92)_100%)] p-5 shadow-[0_18px_42px_rgba(14,165,233,0.08)]">
        <div className="pointer-events-none absolute -right-10 top-4 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">Attachment</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">Add context only if it helps.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload a brief, screenshot, notes, or product file so the draft has better context.
          </p>
          <input
            key={attachment ? attachment.name : "empty-attachment"}
            id="setup-attachment"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="sr-only"
          />
          <label
            htmlFor="setup-attachment"
            className="mt-4 flex cursor-pointer flex-col gap-3 rounded-[24px] border border-dashed border-sky-300 bg-white/80 px-4 py-5 transition hover:border-sky-400 hover:bg-white"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
              +
            </span>
            <span className="text-base font-semibold text-slate-900">
              {attachment ? attachment.name : "Choose a context file"}
            </span>
            <span className="text-sm leading-6 text-slate-500">
              {attachment ? `${getAttachmentExtension(attachment)} file ready for generation` : "PDF, DOC, DOCX, TXT, PNG, JPG, or JPEG"}
            </span>
          </label>
          {attachment && (
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Remove file
            </button>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-orange-200 bg-[linear-gradient(145deg,rgba(255,247,237,0.96)_0%,rgba(255,255,255,0.98)_55%,rgba(255,241,242,0.92)_100%)] p-5 shadow-[0_18px_42px_rgba(249,115,22,0.08)]">
        <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-orange-300/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">Variations</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Set draft count.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pick a quick pass or compare more options.
              </p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-2xl font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.2)]">
              {variationCount}
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-orange-100 bg-white/80 p-2 shadow-inner">
            <div className="grid grid-cols-4 gap-2">
              {variationOptions.map((count) => (
                <motion.button
                  key={count}
                  type="button"
                  {...buttonMotion}
                  onClick={() => setVariationCount(count)}
                  className={`h-12 rounded-2xl text-base font-semibold transition ${
                    variationCount === count
                      ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]"
                      : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                  }`}
                >
                  {count}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-orange-100 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-950">{variationLabels[variationCount]}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {variationCount === 1
                ? "Best when you need one clean draft quickly."
                : variationCount === 2
                  ? "Best for comparing two strong directions."
                  : variationCount === 3
                    ? "Best when you want a little creative range."
                    : "Best when you want the widest set before editing."}
            </p>
          </div>
        </div>
      </section>
    </div>

    <div className="mt-4 rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#020617_0%,#111827_55%,#0f766e_100%)] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Draft Command Center</p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight">
            {variationCount} draft{variationCount === 1 ? "" : "s"} ready in {language}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Final check: {formatToneList(form.tones)} voice, {attachment ? "with uploaded context" : "without extra context"}.
          </p>
        </div>
        <motion.button
          type="submit"
          {...buttonMotion}
          disabled={isGenerating}
          className={`relative inline-flex min-h-[54px] min-w-[190px] items-center justify-center overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold transition ${
            isGenerating
              ? "bg-white text-slate-950 shadow-[0_18px_45px_rgba(249,115,22,0.28)]"
              : "bg-white text-slate-950 hover:bg-slate-100"
          } disabled:cursor-not-allowed disabled:bg-slate-300`}
        >
          {isGenerating && (
            <motion.span
              aria-hidden="true"
              initial={{ width: 0 }}
              animate={{ width: `${buttonProgress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(14,165,233,0.35)_0%,rgba(16,185,129,0.45)_55%,rgba(249,115,22,0.45)_100%)]"
            />
          )}
          <span className="relative z-10">
            {isGenerating ? "Generating..." : generateButtonLabel}
          </span>
        </motion.button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Subject", form.subject || "Not added"],
          ["Tone", formatToneList(form.tones)],
          ["Context", attachment ? getAttachmentExtension(attachment) : "Optional"],
        ].map(([label, value]) => (
          <div key={`setup-summary-${label}`} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>

    {isGenerating && (
      <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-[0_18px_45px_rgba(16,185,129,0.10)]">
        <p className="text-sm font-semibold text-emerald-950">
          {generationProgress.find((item) => item?.startsWith("Generating")) ||
            `Generating ${variationCount === 1 ? "your draft" : `${variationCount} drafts`}...`}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: variationCount }).map((_, index) => (
            <motion.div
              key={`${index}-${generationProgress[index] || "pending"}`}
              {...progressItemMotion}
              className={`rounded-2xl border px-4 py-3 transition ${
                generationProgress[index]?.includes("ready")
                  ? "border-emerald-200 bg-white text-emerald-800"
                  : generationProgress[index]?.startsWith("Generating")
                    ? "border-cyan-200 bg-white text-cyan-800 shadow-[0_10px_24px_rgba(14,165,233,0.12)]"
                    : "border-slate-200 bg-white/70 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.24em]">Draft {index + 1}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    generationProgress[index]?.includes("ready")
                      ? "bg-emerald-500"
                      : generationProgress[index]?.startsWith("Generating")
                        ? "bg-cyan-500"
                        : "bg-slate-300"
                  }`}
                />
              </div>
              <p className="mt-2 text-sm font-semibold">
                {generationProgress[index]?.includes("ready")
                  ? "Ready"
                  : generationProgress[index]?.startsWith("Generating")
                    ? "Writing now"
                    : "Waiting"}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

export default SetupStep;
