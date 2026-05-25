import { motion } from "framer-motion";
import { Bot, FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SkeletonCard } from "../shared/SkeletonCard";

const defaultMessages = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hello. I am your Autonomous Bureaucracy Navigator. Start a workflow from chat to see guided steps here.",
  },
];

export function DashboardCards({
  onOpenChat,
  onOpenUpload,
  setActiveCard,
  uploadedFiles,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState(defaultMessages);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 850);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("chat_history");
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRecentMessages(parsed.slice(-3));
      }
    } catch {
      setRecentMessages(defaultMessages);
    }
  }, []);

  const previewMessages = useMemo(() => {
    const filteredMessages = recentMessages.filter(
      (message) =>
        !message.content.includes("upload API") &&
        message.content.trim().length > 2,
    );

    return filteredMessages.slice(-2);
  }, [recentMessages]);

  const uploadSummary = useMemo(() => {
    if (uploadedFiles.length === 0) {
      return "No uploaded documents yet.";
    }

    return `${uploadedFiles.length} uploaded file${uploadedFiles.length === 1 ? "" : "s"} ready for review.`;
  }, [uploadedFiles]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        whileHover={{ y: -4 }}
        className="h-full min-h-[260px] rounded-[30px] border border-slate-200/80 bg-white/70 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Chat Preview</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  Start your latest conversation
                </h3>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-400">
                  Start your workflow.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 p-3">
                <Bot className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {previewMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-white/[0.08] dark:bg-slate-800 dark:text-slate-300"
                >
                  <p className="line-clamp-3">{message.content}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveCard("chat");
              onOpenChat();
            }}
            className="mt-6 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/30"
          >
            Open Chat
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        whileHover={{ y: -4 }}
        className="h-full min-h-[260px] rounded-[30px] border border-slate-200/80 bg-white/70 p-6 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-400">Upload Documents</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  Add files to the current workflow
                </h3>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-400">
                  Upload your supporting documents records for extraction.
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-3">
                <UploadCloud className="h-5 w-5 text-white" />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-slate-800">
              <p className="text-4xl font-semibold text-slate-900 dark:text-white">{uploadedFiles.length}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-400">{uploadSummary}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveCard("upload");
              onOpenUpload();
            }}
            className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
          >
            Upload Now
          </button>
        </div>
      </motion.div>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -4 }}
        onClick={() => setActiveCard("permissions")}
        className="h-full min-h-[260px] rounded-[30px] border border-slate-200/80 bg-white/70 p-6 text-left shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-400">Permissions</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Explore required approvals
              </h3>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-400">
                Explore required approvals and government permissions.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 p-3">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </motion.button>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        whileHover={{ y: -4 }}
        onClick={() => setActiveCard("applications")}
        className="h-full min-h-[260px] rounded-[30px] border border-slate-200/80 bg-white/70 p-6 text-left shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]"
      >
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-400">Applications</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Manage application forms
              </h3>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-400">
                Track, autofill, and manage your application forms.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-3">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
