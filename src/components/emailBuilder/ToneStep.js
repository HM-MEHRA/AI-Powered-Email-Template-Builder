import { motion } from "framer-motion";
import { buttonMotion, stepPanelMotion, toneCardMotion } from "./motion";

const fallbackToneStyle = {
  accent: "from-slate-800 to-slate-600",
  ring: "ring-slate-300",
  bg: "from-slate-50 to-white",
  text: "text-slate-900",
  note: "Balanced tone",
};

const ToneStep = ({
  form,
  formatToneList,
  language,
  setToneMode,
  toggleTone,
  toneGroups,
  toneStyles,
  variationCount,
}) => (
  <motion.div key="tone-step-panel" {...stepPanelMotion} className="relative">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
        Tone Required
      </label>
      <div className="relative grid grid-cols-2 rounded-[20px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(241,245,249,0.96)_52%,rgba(226,232,240,0.92)_100%)] p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur sm:inline-grid sm:rounded-[24px]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-10 bg-[radial-gradient(circle,rgba(59,130,246,0.16)_0%,rgba(59,130,246,0)_72%)] blur-xl" />
        {[
          {
            label: "Single Tone",
            value: "single",
            hint: "One clear voice",
            activeClass: "bg-[linear-gradient(135deg,#14532d_0%,#15803d_48%,#22c55e_100%)] text-white shadow-[0_16px_34px_rgba(21,128,61,0.24)]",
          },
          {
            label: "Multi Tone",
            value: "multiple",
            hint: "Blend draft styles",
            activeClass: "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#0ea5e9_100%)] text-white shadow-[0_16px_34px_rgba(30,64,175,0.24)]",
          },
        ].map((option) => (
          <motion.button
            key={option.value}
            type="button"
            {...buttonMotion}
            onClick={() => setToneMode(option.value)}
            className={`relative min-w-0 rounded-[16px] px-3 py-3 text-left transition sm:min-w-[150px] sm:rounded-[18px] sm:px-4 ${
              form.toneMode === option.value
                ? option.activeClass
                : "text-slate-600 hover:bg-white/85 hover:text-slate-900"
            }`}
          >
            <span
              className={`absolute inset-0 rounded-[18px] transition ${
                form.toneMode === option.value
                  ? "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_44%)]"
                  : "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.82),transparent_50%)] opacity-0 hover:opacity-100"
              }`}
              aria-hidden="true"
            />
            <span className="relative block">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.24em]">
                {option.label}
              </span>
              <span className={`mt-1 block text-[11px] ${form.toneMode === option.value ? "text-white/78" : "text-slate-500"}`}>
                {option.hint}
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>

    <div className="mt-3 space-y-4">
      {toneGroups.map((group) => (
        <div
          key={group.label}
          className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">
            {group.label}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.options.map((tone) => {
              const isSelected = form.tones.includes(tone);
              const style = toneStyles[tone] || fallbackToneStyle;

              return (
                <motion.button
                  key={tone}
                  type="button"
                  {...toneCardMotion}
                  onClick={() => toggleTone(tone)}
                  className={`group relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition ${
                    isSelected
                      ? `border-transparent bg-gradient-to-br ${style.accent} text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]`
                      : `border-slate-200 bg-gradient-to-br ${style.bg} hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]`
                  }`}
                >
                  <span
                    className={`absolute inset-0 opacity-0 transition group-hover:opacity-100 ${
                      isSelected
                        ? "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_42%)]"
                        : "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.95),_transparent_45%)]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative flex min-h-[104px] flex-col pt-1">
                    <span>
                      <span className={`block text-[1rem] font-semibold leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                        {tone}
                      </span>
                      <span className={`mt-2 block text-xs ${isSelected ? "text-white/80" : style.text}`}>
                        {style.note}
                      </span>
                    </span>
                    {isSelected ? (
                      <span className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                        On
                      </span>
                    ) : (
                      <span className={`mt-auto inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.text} ring-1 ${style.ring} border-white/80 bg-white/80`}>
                        Pick
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Selected Tone</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {form.tones.map((tone) => (
            <span key={`tone-panel-${tone}`} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
              {tone}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {form.toneMode === "multiple"
            ? "Multiple tones create draft variety for this email."
            : "One tone keeps this email focused and consistent."}
        </p>
      </div>
      <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-700">Draft Feel</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {[
            ["Mode", form.toneMode === "multiple" ? "Blended" : "Focused"],
            ["Count", `${variationCount} draft${variationCount === 1 ? "" : "s"}`],
            ["Language", language],
          ].map(([label, value]) => (
            <div key={`tone-summary-${label}`} className="rounded-2xl bg-white/85 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

export default ToneStep;
