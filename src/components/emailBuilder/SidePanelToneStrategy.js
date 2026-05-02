import { motion } from "framer-motion";

const ToneStrategy = ({
  applyTonePreset,
  form,
  formatToneList,
  handleGenerateNext,
  toneBlueprint,
  tonePresets,
  toneStrategyFit,
}) => (
  <div className="relative flex h-full flex-1 flex-col gap-4">
    <div>
      <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-700">
        Tone Strategy
      </div>
      <h3 className="mt-3 text-[1.85rem] font-semibold leading-tight text-slate-900">
        Pick a fast preset, then fine tune only if needed.
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        The goal is speed: choose the closest voice and generate. Multi Tone is best when you want useful variety without manually testing every option.
      </p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {tonePresets.map((preset) => {
        const isActive =
          form.toneMode === preset.toneMode &&
          preset.tones.every((tone) => form.tones.includes(tone)) &&
          form.tones.length === preset.tones.length;

        return (
          <button
            key={`support-${preset.label}`}
            type="button"
            onClick={() => applyTonePreset(preset)}
            className={`rounded-[22px] border px-4 py-4 text-left transition ${
              isActive
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white/80 text-slate-800 hover:border-slate-300"
            }`}
          >
            <span className="block text-sm font-semibold">{preset.label}</span>
            <span className={`mt-2 block text-xs leading-5 ${isActive ? "text-white/70" : "text-slate-500"}`}>
              {preset.note}
            </span>
          </button>
        );
      })}
    </div>
    <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Quick Flow</p>
      <div className="mt-3 grid gap-2">
        {[
          ["1", "Choose the closest preset"],
          ["2", "Fine tune with the tone cards"],
          ["3", "Continue when the style feels right"],
        ].map(([step, label]) => (
          <div key={`tone-flow-${step}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
              {step}
            </span>
            <span className="text-sm font-semibold text-slate-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="grid gap-3 xl:grid-cols-2">
      <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Live Preview</p>
        <div className="mt-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_12px_30px_rgba(14,165,233,0.10)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Subject</p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
            {form.subject || "Your subject will appear here"}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {form.toneMode === "multiple"
              ? "The draft will blend clarity, warmth, and persuasion without feeling overworked."
              : `The draft will keep a ${formatToneList(form.tones).toLowerCase()} voice from greeting to CTA.`}
          </p>
        </div>
      </div>
      <div className="rounded-[24px] border border-orange-200 bg-orange-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Best Use</p>
        <div className="mt-3 space-y-2">
          {toneStrategyFit.map(([label, note]) => (
            <div key={`tone-fit-${label}`} className="rounded-2xl bg-white/85 px-3 py-3">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Draft Blueprint</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {toneBlueprint.map(([label, note], index) => (
          <div key={`tone-blueprint-${label}`} className="rounded-2xl bg-white/85 px-3 py-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              {index + 1}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="rounded-[24px] border border-indigo-200 bg-white/90 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">Voice Balance</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {form.toneMode === "multiple" ? "Balanced across clarity, warmth, and persuasion." : "Focused on one consistent writing style."}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          {formatToneList(form.tones)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {[
          ["Clarity", form.tones.some((tone) => ["Professional", "Direct", "Formal", "Corporate", "Analytical", "Diplomatic"].includes(tone)) ? 92 : 76],
          ["Warmth", form.tones.some((tone) => ["Friendly", "Warm", "Empathetic", "Inviting", "Conversational", "Cheerful"].includes(tone)) ? 88 : 64],
          ["Push", form.tones.some((tone) => ["Persuasive", "Urgent", "Bold", "Confident", "Promotional", "Storytelling"].includes(tone)) ? 86 : 58],
        ].map(([label, value]) => (
          <div key={`tone-balance-${label}`}>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{label}</span>
              <span>{value}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8,#6366f1,#f97316)]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Next Move</p>
          <p className="mt-2 text-lg font-semibold">Lock the voice and continue to setup.</p>
        </div>
        <button
          type="button"
          onClick={handleGenerateNext}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
);


export default ToneStrategy;
