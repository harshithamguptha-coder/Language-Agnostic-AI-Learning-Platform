import { motion } from "framer-motion";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  badges = [],
}) {
  return (
    <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-slate-950/75 px-7 py-8 shadow-[0_22px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl md:px-8 md:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_26%)]" />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.4em] text-sky-200/70"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] text-white md:text-5xl"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-2xl text-lg leading-8 text-slate-400"
          >
            {description}
          </motion.p>

          {badges.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className={[
                    "rounded-2xl border px-5 py-3 text-base font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                    badge.primary
                      ? "border-sky-400/20 bg-sky-400/10 text-sky-50"
                      : "border-white/10 bg-white/[0.03] text-slate-300",
                  ].join(" ")}
                >
                  {badge.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
