import { CheckCircle2 } from "lucide-react";

const trackerStages = [
  "uploaded",
  "processed",
  "submitted",
  "in_review",
  "approved",
];

const stageLabels = {
  uploaded: "Uploaded",
  processed: "Processed",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
};

export function ApplicationTracker({ currentStep }) {
  const activeIndex = Math.min(currentStep, trackerStages.length - 1);

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-soft backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Application tracker
          </p>
          <h4 className="mt-2 text-lg font-semibold text-white">
            Application progress
          </h4>
        </div>
        <span className="inline-flex rounded-full border border-white/10 bg-slate-950/30 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-400">
          {stageLabels[trackerStages[activeIndex]]}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3 overflow-x-auto">
        {trackerStages.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={stage} className="flex items-center gap-3">
              <div
                className={`flex h-12 min-w-[120px] items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-all duration-200 ${
                  isCompleted
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                    : isCurrent
                    ? "border-sky-400/50 bg-sky-400/10 text-white"
                    : "border-white/10 bg-slate-950/30 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" />
                ) : null}
                <span>{stageLabels[stage]}</span>
              </div>
              {index < trackerStages.length - 1 ? (
                <div
                  className={`h-px flex-1 ${
                    isCompleted ? "bg-emerald-400/50" : "bg-white/10"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
