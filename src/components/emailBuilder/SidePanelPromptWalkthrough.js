import { AnimatePresence, motion } from "framer-motion";
import { walkthroughSwapMotion } from "./motion";

const PromptWalkthrough = ({
  activeWalkthrough,
  setWalkthroughIndex,
  walkthroughExamplesLength,
  walkthroughIndex,
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={activeWalkthrough.outputSubject}
      {...walkthroughSwapMotion}
      className="flex flex-col gap-3"
    >
      <div>
        <div className="inline-flex items-center rounded-full border border-orange-200 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-700 shadow-[0_10px_24px_rgba(249,115,22,0.08)] backdrop-blur">
          Example Walkthrough
        </div>
        <h3 className="mt-3 max-w-xl text-[1.85rem] font-semibold leading-tight text-slate-900">
          {activeWalkthrough.title}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          {activeWalkthrough.description} Then compare the generated drafts and press <span className="font-semibold text-slate-900">Use This</span> on the one you want to refine.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
          <span>{activeWalkthrough.eyebrow}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>
            {walkthroughIndex + 1}/{walkthroughExamplesLength}
          </span>
        </div>
        <div className="flex gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              setWalkthroughIndex((current) =>
                current === 0 ? walkthroughExamplesLength - 1 : current - 1
              )
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Previous
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              setWalkthroughIndex((current) => (current + 1) % walkthroughExamplesLength)
            }
            className="rounded-full border border-orange-300 bg-orange-100 px-4 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-200"
          >
            Next
          </motion.button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.98)_100%)] p-4 shadow-[0_16px_36px_rgba(245,158,11,0.10)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">Sample Input</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
              Prompt
            </span>
          </div>
          <div className="mt-3 space-y-2.5 text-sm leading-7 text-slate-700">
            <div className="rounded-2xl bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Subject</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{activeWalkthrough.subject}</p>
            </div>
            <div className="rounded-2xl bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Purpose</p>
              <p className="mt-2">{activeWalkthrough.purpose}</p>
            </div>
            <div className="rounded-2xl bg-white/75 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tone</p>
              <p className="mt-2">
                {activeWalkthrough.tones.map((tone, index) => (
                  <span
                    key={`${activeWalkthrough.outputSubject}-${tone}`}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      index === 0
                        ? "bg-orange-100 text-orange-800"
                        : "ml-2 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tone}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(59,130,246,0.08)_0%,rgba(244,114,182,0.08)_100%)]" />
          <div className="relative flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sample Draft Shape</p>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
              Output
            </span>
          </div>
          <div className="relative mt-3 rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700">
            <p className="font-semibold text-slate-900">Subject: {activeWalkthrough.outputSubject}</p>
            <p className="mt-4">{activeWalkthrough.greeting}</p>
            {activeWalkthrough.paragraphs.map((paragraph) => (
              <p
                key={`${activeWalkthrough.outputSubject}-${paragraph.slice(0, 24)}`}
                className="mt-3"
              >
                {paragraph}
              </p>
            ))}
            <p className="mt-4">
              {activeWalkthrough.closing}
              <br />
              [Your Name]
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  </AnimatePresence>
);


export default PromptWalkthrough;
