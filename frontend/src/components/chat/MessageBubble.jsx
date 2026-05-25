import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-[28px] px-5 py-4 text-sm leading-7 shadow-soft md:max-w-[70%]",
          isUser
            ? "rounded-br-md bg-gradient-to-br from-sky-500 to-cyan-500 text-white"
            : "rounded-bl-md border border-white/10 bg-white/[0.08] text-slate-100 backdrop-blur-xl",
        ].join(" ")}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ ...props }) => <p className="mb-3 last:mb-0" {...props} />,
            ul: ({ ...props }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0" {...props} />,
            ol: ({ ...props }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0" {...props} />,
            code: ({ inline, children, ...props }) =>
              inline ? (
                <code
                  className="rounded-md bg-slate-900/70 px-1.5 py-1 text-sky-200"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code
                  className="block overflow-x-auto rounded-2xl bg-slate-950/70 p-4 text-sky-100"
                  {...props}
                >
                  {children}
                </code>
              ),
            a: ({ ...props }) => (
              <a className="text-sky-300 underline decoration-sky-400/50 underline-offset-4" {...props} />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}
