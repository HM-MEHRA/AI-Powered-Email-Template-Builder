import { motion } from "framer-motion";
import { buildEmailBody } from "./previewUtils";

const TemplateComparisonGuide = ({ compareTemplates, comparisonSummary }) => {
  if (compareTemplates.length < 2 || !comparisonSummary) return null;

  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Comparison Guide</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {comparisonSummary.overallWinner === "tie" ? "No clear winner yet" : `Best Overall: ${comparisonSummary.winnerTemplate.subject}`}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Comparing {comparisonSummary.scoredTemplates.length} selected drafts. {comparisonSummary.summary}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {comparisonSummary.categories.map((category) => {
            const winnerIndex = comparisonSummary.scoredTemplates.findIndex(
              (item) => item.template.id === category.winner
            );
            const winnerLabel = category.winner === "tie" || winnerIndex < 0 ? "Tie" : `Draft ${winnerIndex + 1}`;

            return (
              <div key={category.key} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{category.label}</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">{winnerLabel}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{category.reason}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {comparisonSummary.scoredTemplates.map(({ template, scores }, index) => {
          const isWinner = comparisonSummary.overallWinner === template.id;

          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[28px] border p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-6 ${
                isWinner ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Draft {index + 1}</p>
                  <h4 className="mt-2 break-words text-lg font-semibold text-slate-900 sm:text-xl">{template.subject}</h4>
                </div>
                <div className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${isWinner ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                  Overall {scores.overallScore}/100
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Subject", scores.subjectScore],
                  ["Clarity", scores.clarityScore],
                  ["CTA", scores.ctaScore],
                  ["Warmth", scores.warmthScore],
                ].map(([label, score]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">{score}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Why it scores this way</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {scores.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Preview</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{buildEmailBody(template)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateComparisonGuide;
