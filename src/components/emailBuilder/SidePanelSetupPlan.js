const SetupPlan = ({ form, formatToneList, language, variationCount }) => (
  <div className="relative space-y-3">
    <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/80 p-4">
      <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
        Generation Plan
      </div>
      <h3 className="mt-3 text-2xl font-semibold leading-tight text-slate-900">
        Ready when you are.
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Confirm the setup, generate, then edit the strongest draft.
      </p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        ["Subject", form.subject || "Not added"],
        ["Language", language],
        ["Tone", formatToneList(form.tones)],
        ["Output", `${variationCount} draft${variationCount === 1 ? "" : "s"}`],
      ].map(([label, value]) => (
        <div key={`plan-${label}`} className="rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
          <p className="mt-2 truncate text-base font-semibold text-slate-900">{value}</p>
        </div>
      ))}
    </div>
    <div className="rounded-[24px] border border-orange-200 bg-orange-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">After Generate</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {["Drafts appear in the Edit step", "Pick the strongest variation", "Refine, copy, export, or save"].map((item, index) => (
          <div key={item} className="rounded-2xl bg-white/80 px-3 py-3 text-sm text-slate-700">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="mt-2 block leading-5">{item}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);


export default SetupPlan;
