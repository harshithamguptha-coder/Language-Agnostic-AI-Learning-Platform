import {
  Activity,
  Bot,
  FileCheck2,
  FileClock,
  FileText,
  Files,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

export const navigationItems = [
  { id: "chat", label: "Chat", icon: Bot },
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "upload", label: "Upload Documents", icon: UploadCloud },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "applications", label: "Applications", icon: FileText },
];

export const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hello. I am your **Autonomous Bureaucracy Navigator**.\n\nI can analyze uploaded forms, summarize process requirements, and help you move through complex government workflows with confidence.",
  },
  {
    id: "hint",
    role: "assistant",
    content:
      "Try asking things like:\n\n- `What documents do I need for a small business registration?`\n- `Summarize the uploaded permit packet.`\n- `Create a step-by-step action plan from these files.`",
  },
];

export const dashboardStats = [
  {
    id: "documents",
    title: "Total documents",
    value: 24,
    suffix: "",
    trend: "+12% this week",
    icon: Files,
    accent: "from-sky-500/20 to-cyan-500/10",
  },
  {
    id: "processing",
    title: "Processing status",
    value: 87,
    suffix: "%",
    trend: "8 files in active review",
    icon: FileClock,
    accent: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "completed",
    title: "Completed reviews",
    value: 19,
    suffix: "",
    trend: "3 finalized today",
    icon: FileCheck2,
    accent: "from-violet-500/20 to-fuchsia-500/10",
  },
];

export const recentActivity = [
  {
    id: 1,
    title: "Vendor permit packet analyzed",
    detail: "Risk summary generated with 3 required follow-ups.",
    time: "2 minutes ago",
  },
  {
    id: 2,
    title: "Passport renewal checklist created",
    detail: "Deadlines and supporting ID requirements extracted.",
    time: "14 minutes ago",
  },
  {
    id: 3,
    title: "Tax registration dossier uploaded",
    detail: "Files queued for OCR and policy classification.",
    time: "36 minutes ago",
  },
];

export const suggestedPrompts = [
  "Summarize the latest uploaded documents into an executive brief.",
  "List missing compliance documents and rank them by urgency.",
  "Turn this permit workflow into a clear step-by-step checklist.",
];
