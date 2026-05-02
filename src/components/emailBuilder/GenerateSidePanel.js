import { motion } from "framer-motion";
import { scrollFloatMotion, scrollRevealMotion } from "./motion";
import PromptWalkthrough from "./SidePanelPromptWalkthrough";
import SetupPlan from "./SidePanelSetupPlan";
import ToneStrategy from "./SidePanelToneStrategy";

const GenerateSidePanel = ({
  activeGenerateStepIndex,
  activeWalkthrough,
  applyTonePreset,
  attachment,
  editableTemplate,
  form,
  formatToneList,
  generateStep,
  handleGenerateNext,
  language,
  setWalkthroughIndex,
  steps,
  templateCountLabel,
  templates,
  toneBlueprint,
  tonePresets,
  toneStrategyFit,
  variationCount,
  walkthroughExamplesLength,
  walkthroughIndex,
}) => (
  <div className={`${generateStep === "setup" ? "hidden" : "flex"} h-full min-h-full flex-col gap-6 self-stretch ${generateStep === "tone" ? "lg:order-1" : ""}`}>
    <motion.div
      {...scrollFloatMotion}
      transition={{ ...scrollRevealMotion.transition, delay: 0.08 }}
      className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#020617_0%,#111827_44%,#312e81_100%)] p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(90deg,rgba(249,115,22,0.28),rgba(14,165,233,0.18),rgba(16,185,129,0.16))]" />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 22, 0], y: [0, -16, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-10 top-8 h-36 w-36 rounded-full border border-white/10 bg-white/10 blur-sm"
      />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, -18, 0], y: [0, 12, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-orange-400/20 blur-2xl"
      />

      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 lg:max-w-2xl">
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-100">
              Draft Command Center
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
              Build, tune, and ship the best email version.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Your current setup stays visible here so you can move quickly without hunting through the form.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur">
            Step {activeGenerateStepIndex + 1} of {steps.length}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Fresh Emails", templates.length || variationCount, templates.length ? templateCountLabel : `${variationCount} planned`],
            [
              "Tone",
              form.toneMode === "multiple" ? "Multi Tone" : formatToneList(form.tones),
              form.toneMode === "multiple" ? `${form.tones.length} tones selected` : "single voice",
            ],
            ["Language", language, "preferred output"],
            ["Context", attachment ? "Attached" : "Optional", attachment ? attachment.name : "no file yet"],
          ].map(([label, value, note]) => (
            <motion.div
              key={label}
              whileHover={{ y: -4, scale: 1.02 }}
              className="min-h-[122px] rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.12)] backdrop-blur"
            >
              <p className="break-words text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">{label}</p>
              <p
                className={`mt-3 whitespace-nowrap font-semibold leading-tight text-white ${
                  String(value).length > 8
                    ? "text-[1.02rem] sm:text-[1.08rem] 2xl:text-[1.2rem]"
                    : "text-[1.35rem] sm:text-[1.45rem] xl:text-[1.25rem] 2xl:text-[1.45rem]"
                }`}
                title={String(value)}
              >
                {value}
              </p>
              <p className="mt-2 break-words text-xs leading-5 text-slate-300">{note}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Prompt", form.subject ? "Ready" : "Waiting", form.subject || "Add your email subject"],
            ["Setup", `${variationCount} output${variationCount === 1 ? "" : "s"}`, attachment ? "file context included" : "no attachment needed"],
            ["Workspace", editableTemplate ? "Open" : "Standby", editableTemplate ? "draft loaded for editing" : "generate to edit"],
          ].map(([label, status, note], index) => (
            <div key={label} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${index <= activeGenerateStepIndex ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" : "bg-slate-600"}`} />
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{status}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((activeGenerateStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="h-2 rounded-full bg-[linear-gradient(90deg,#f97316,#0ea5e9,#10b981)]"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {["Fast setup", "Flexible tones", "Edit after generation"].map((chip) => (
            <span key={chip} className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </motion.div>

    {generateStep !== "workspace" && (
      <motion.div
        {...scrollFloatMotion}
        transition={{ ...scrollRevealMotion.transition, delay: 0.11 }}
        className="relative flex h-full flex-1 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_42%,rgba(255,247,237,0.92)_100%)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(249,115,22,0.14)_0%,rgba(56,189,248,0.12)_52%,rgba(244,114,182,0.12)_100%)]" />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 10, 0], y: [0, -8, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-8 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.3)_0%,rgba(251,146,60,0)_68%)] blur-sm"
        />
        {generateStep === "tone" && (
          <ToneStrategy
            applyTonePreset={applyTonePreset}
            form={form}
            formatToneList={formatToneList}
            handleGenerateNext={handleGenerateNext}
            toneBlueprint={toneBlueprint}
            tonePresets={tonePresets}
            toneStrategyFit={toneStrategyFit}
          />
        )}
        {generateStep === "setup" && (
          <SetupPlan
            form={form}
            formatToneList={formatToneList}
            language={language}
            variationCount={variationCount}
          />
        )}
        {generateStep === "prompt" && (
          <PromptWalkthrough
            activeWalkthrough={activeWalkthrough}
            setWalkthroughIndex={setWalkthroughIndex}
            walkthroughExamplesLength={walkthroughExamplesLength}
            walkthroughIndex={walkthroughIndex}
          />
        )}
      </motion.div>
    )}
  </div>
);

export default GenerateSidePanel;
