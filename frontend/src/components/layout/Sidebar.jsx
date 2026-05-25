import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { navigationItems } from "../../data/mock";

export function Sidebar({
  activeTab,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onTabChange,
  onToggleCollapse,
  theme,
  onToggleTheme,
}) {
  return (
    <>
      <AnimatePresence>
        {isMobileOpen ? (
          <motion.button
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex border-r border-white/10 bg-slate-950/80 backdrop-blur-xl",
          isCollapsed ? "w-[92px]" : "w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        animate={{ width: isCollapsed ? 92 : 280 }}
        transition={{ type: "spring", damping: 20, stiffness: 180 }}
      >
        <div className="flex h-full w-full flex-col px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 text-slate-950 shadow-lg shadow-sky-500/25">
                <Sparkles className="h-5 w-5" />
              </div>
              {!isCollapsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="min-w-0"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    AI AGENT
                  </p>
                  <h1 className="text-sm font-semibold text-white">
                    Autonomous Bureaucracy Navigator
                  </h1>
                </motion.div>
              ) : null}
            </div>

            <button
              type="button"
              className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/10 lg:inline-flex"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-8 space-y-2">
            {navigationItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;

              return (
                <motion.button
                  key={id}
                  type="button"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onTabChange(id);
                    onCloseMobile();
                  }}
                  className={[
                    "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition",
                    isActive
                      ? "border-sky-400/30 bg-gradient-to-r from-sky-500/20 to-cyan-500/10 text-white shadow-soft"
                      : "border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                    isCollapsed ? "justify-center" : "",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed ? <span className="truncate">{label}</span> : null}
                  {isActive ? (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute inset-0 -z-10 rounded-2xl"
                    />
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-auto space-y-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-white/10"
              onClick={onToggleTheme}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
              {!isCollapsed ? (
                <>
                  <span className="flex-1">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
                  <span className="text-xs text-slate-500">
                    {theme === "dark" ? "On" : "Off"}
                  </span>
                </>
              ) : null}
            </button>

            <button
              type="button"
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400 transition hover:border-white/20 hover:bg-white/10 lg:hidden"
              onClick={onCloseMobile}
            >
              <ChevronLeft className="h-4 w-4" />
              {!isCollapsed ? <span>Close panel</span> : null}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
