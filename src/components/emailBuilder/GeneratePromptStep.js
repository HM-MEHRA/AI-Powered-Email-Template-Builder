import { motion } from "framer-motion";
import { buttonMotion, stepPanelMotion, toneCardMotion } from "./motion";

const GeneratePromptStep = ({
  brandVoice,
  brandVoicePresets,
  form,
  language,
  languageOptions,
  onPromptStarter,
  promptStarters,
  setBrandVoice,
  setLanguage,
  subjectInsights,
  updateField,
}) => (
  <motion.div key="prompt-step-panel" {...stepPanelMotion} className="relative">
    <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
      Subject
    </label>
    <input
      type="text"
      value={form.subject}
      onChange={(event) => updateField("subject", event.target.value)}
      placeholder="Quarterly product update"
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
    />

    <label className="mt-6 block text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
      Prompt Optional
    </label>
    <textarea
      value={form.purpose}
      onChange={(event) => updateField("purpose", event.target.value)}
      placeholder="Leave blank to create a prompt from the subject, or add details for better results."
      rows="7"
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
    />

    <div className="mt-6 space-y-4 2xl:grid 2xl:grid-cols-[0.9fr_1.1fr] 2xl:gap-4 2xl:space-y-0">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Quick Start Prompts
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {promptStarters.map((starter) => (
            <motion.button
              key={starter.label}
              type="button"
              {...buttonMotion}
              onClick={() => onPromptStarter(starter)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {starter.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Subject Score
        </label>
        <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <p className="text-3xl font-semibold text-slate-900">
            {subjectInsights.score}
            <span className="text-base text-slate-500">/100</span>
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {subjectInsights.tips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="mt-6 grid gap-4 2xl:grid-cols-2">
      <div>
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Brand Voice Optional
        </label>
        <input
          type="text"
          value={brandVoice}
          onChange={(event) => setBrandVoice(event.target.value)}
          list="brand-voice-presets"
          placeholder="Optional style: simple and clear, warm and human, direct and confident"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
        />
        <datalist id="brand-voice-presets">
          {brandVoicePresets.map((voice) => (
            <option key={voice} value={voice} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Language
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {languageOptions.map((option) => {
            const isActive = language === option.label;

            return (
              <motion.button
                key={option.label}
                type="button"
                {...toneCardMotion}
                onClick={() => setLanguage(option.label)}
                className={`relative min-h-[116px] overflow-hidden rounded-[20px] border px-4 py-4 text-left transition sm:min-h-[128px] sm:rounded-[22px] ${
                  isActive
                    ? `border-transparent bg-gradient-to-br ${option.accent} text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]`
                    : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
                }`}
              >
                <span
                  className={`absolute inset-0 opacity-0 transition ${
                    isActive
                      ? "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_42%)] opacity-100"
                      : "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.95),_transparent_45%)] hover:opacity-100"
                  }`}
                  aria-hidden="true"
                />
                <span className="relative flex h-full min-w-0 flex-col">
                  <span className={`block text-[1.05rem] font-semibold leading-tight ${isActive ? "text-white" : "text-slate-900"}`}>
                    {option.label}
                  </span>
                  <span className={`mt-2 block max-w-[12ch] text-sm leading-6 ${isActive ? "text-white/80" : "text-slate-500"}`}>
                    {option.note}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  </motion.div>
);

export default GeneratePromptStep;
