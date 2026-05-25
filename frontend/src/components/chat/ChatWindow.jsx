import { AnimatePresence, motion } from "framer-motion";
import { Menu, SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { initialMessages } from "../../data/mock";
import { MessageBubble } from "./MessageBubble";
import { TypingBubble } from "./TypingBubble";

const defaultMessages = initialMessages.filter(
  (message) => message.id !== "hint"
);

function formatStructuredReply(payload, uploadCount) {
  const sections = [payload.reply];
  const { data = {}, step } = payload;

  if (data.documents?.length) {
    sections.push(`Documents:\n- ${data.documents.join("\n- ")}`);
  }

  if (data.permissions?.length) {
    sections.push(`Permissions:\n- ${data.permissions.join("\n- ")}`);
  }

  if (data.offices?.length) {
    sections.push(`Offices:\n- ${data.offices.join("\n- ")}`);
  }

  if (data.cost_estimation) {
    const costLines = Object.entries(data.cost_estimation).map(
      ([key, value]) => `- ${key.replaceAll("_", " ")}: ${value}`
    );
    sections.push(`Cost estimation:\n${costLines.join("\n")}`);
  }

  if (data.extracted_data && Object.keys(data.extracted_data).length > 0) {
    const extractedLines = Object.entries(data.extracted_data).map(
      ([key, value]) => `- ${key.replaceAll("_", " ")}: ${value}`
    );
    sections.push(`Extracted data:\n${extractedLines.join("\n")}`);
  }

  if (uploadCount > 0 && step === "upload") {
    sections.push(
      `Uploaded documents ready in this session: **${uploadCount}**.`
    );
  }

  return sections.join("\n\n");
}

export function ChatWindow({
  messages,
  onOpenSidebar,
  onSetActiveTab,
  sessionId,
  setMessages,
  uploadedFiles,
  setPermissionsInput,
  setActiveCard,
}) {
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const uploadCount = uploadedFiles.length;

  const emptyState = useMemo(
    () => messages.length <= defaultMessages.length,
    [messages.length]
  );

  const isPermissionQuery = (text) => {
    return text.toLowerCase().includes("permission");
  };

  const isApplicationQuery = (text) => {
    return text.toLowerCase().includes("application");
  };

  const lastUserMessage = useMemo(
    () => messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "",
    [messages]
  );

  const sendMessage = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");

    if (isPermissionQuery(trimmed)) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Let me show you the required permissions...",
        },
      ]);

      setPermissionsInput({
        idea: trimmed,
        location: "bangalore",
      });

      setActiveCard("permissions");
      return;
    }

    if (isApplicationQuery(trimmed)) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Here are the applications required for your process...",
        },
      ]);

      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed.");

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: formatStructuredReply(data, uploadCount),
          step: data.step,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            error.message ||
            "Something went wrong while contacting the backend.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-[32px] border border-white/10 bg-white/[0.04] shadow-glow backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 lg:hidden"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Conversation
            </p>
            <h3 className="text-sm font-medium text-white">
              Regulatory Copilot
            </h3>
          </div>
        </div>

        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          Live assistance
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        {emptyState && (
          <div className="mb-6 rounded-[28px] border border-dashed border-white/10 bg-slate-950/20 p-5">
            <p className="text-sm text-slate-400">
              Start with a prompt or upload documents to unlock tailored process guidance.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-3">
                <MessageBubble message={message} />

                {message.role === "assistant" &&
                  message.step === "upload" && (
                    <div className="flex justify-start">
                      <button
                        onClick={() => onSetActiveTab("upload")}
                        className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-200"
                      >
                        Upload Documents
                      </button>
                    </div>
                  )}

                {index === messages.length - 1 &&
                  isPermissionQuery(lastUserMessage) && (
                    <button
                      onClick={() => onSetActiveTab("permissions")}
                      className="mt-2 rounded-xl bg-green-500/20 px-3 py-1 text-sm text-green-300"
                    >
                      View Permissions
                    </button>
                  )}

                {index === messages.length - 1 &&
                  isApplicationQuery(lastUserMessage) && (
                    <button
                      onClick={() => onSetActiveTab("applications")}
                      className="mt-2 rounded-xl bg-purple-500/20 px-3 py-1 text-sm text-purple-300"
                    >
                      Start Application Process
                    </button>
                  )}
              </div>
            ))}

            {isTyping && <TypingBubble key="typing" />}
          </AnimatePresence>

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 md:px-6">
        <div className="flex items-end gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-3">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(draft);
              }
            }}
            placeholder="Ask about permits, approvals, required documents..."
            className="flex-1 resize-none bg-transparent text-white outline-none"
          />

          <motion.button
            onClick={() => sendMessage(draft)}
            disabled={!draft.trim() || isTyping}
            className="h-12 w-12 rounded-2xl bg-sky-500 text-white"
          >
            <SendHorizonal className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
