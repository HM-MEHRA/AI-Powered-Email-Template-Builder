import { motion } from "framer-motion";
import { buttonMotion } from "./motion";

const GenerateProgressSteps = ({
  activeGenerateStepIndex,
  editableTemplate,
  generateStep,
  onStepChange,
  steps,
}) => (
  <div id="generate-step-start" className="scroll-mt-6 lg:col-span-full">
    <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:rounded-[30px] sm:p-4">
      <div className="mb-3 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          animate={{ width: `${((activeGenerateStepIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="h-2 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#0ea5e9_52%,#10b981_100%)] shadow-[0_0_24px_rgba(14,165,233,0.3)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {steps.map((step, index) => {
          const isActive = generateStep === step.value;
          const isComplete = index < activeGenerateStepIndex;
          const isLocked = step.value === "workspace" && !editableTemplate;

          return (
            <motion.button
              key={step.value}
              type="button"
              {...buttonMotion}
              onClick={() => !isLocked && onStepChange(step.value)}
              disabled={isLocked}
              className={`relative min-h-[92px] overflow-hidden rounded-[18px] border px-3 py-3 text-left transition sm:min-h-[118px] sm:rounded-[24px] sm:px-4 sm:py-4 ${
                isActive
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
                  : isComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              } ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {isActive && (
                <motion.span
                  layoutId="active-generate-step"
                  className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.32),transparent_46%),linear-gradient(135deg,#020617_0%,#111827_52%,#0f766e_100%)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {isComplete && !isActive && (
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 bottom-0 h-1 origin-left bg-emerald-400"
                />
              )}
              <span className="relative z-10 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.26em] opacity-75">
                  Step {index + 1}
                </span>
                <motion.span
                  animate={isActive ? { scale: [1, 1.08, 1], rotate: [0, -4, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-white text-slate-950"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-500"
                  }`}
                >
                  {isComplete ? "OK" : index + 1}
                </motion.span>
              </span>
              <span className="relative z-10 mt-2 block text-base font-semibold sm:mt-4 sm:text-lg">
                {step.label}
              </span>
              <span className={`relative z-10 mt-2 hidden text-sm leading-6 sm:block ${isActive ? "text-white/75" : "text-slate-500"}`}>
                {step.note}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  </div>
);

export default GenerateProgressSteps;
