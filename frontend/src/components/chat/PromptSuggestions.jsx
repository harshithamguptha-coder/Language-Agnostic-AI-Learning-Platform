import { motion } from "framer-motion";

export function PromptSuggestions({ prompts, onSelect }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {prompts.map((prompt, index) => (
        <motion.button
          key={prompt}
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect(prompt)}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left text-sm text-slate-300 transition hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-white"
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}
