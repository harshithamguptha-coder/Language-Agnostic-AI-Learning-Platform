import { motion } from "framer-motion";

export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div className="rounded-[28px] rounded-bl-md border border-white/10 bg-white/[0.08] px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-sky-300"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
