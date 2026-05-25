import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileText, Inbox, ArrowRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";

function maskSensitive(value) {
  if (!value) return "";

  const str = value.toString().replace(/\s/g, "");
  const last4 = str.slice(-4);
  const masked = str.slice(0, -4).replace(/./g, "X");

  return (masked + last4).replace(/(.{4})/g, "$1 ").trim();
}

const acceptedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const requiredDocuments = [
  { name: "Aadhar", key: "aadhar" },
  { name: "PAN", key: "pan" },
  { name: "Passport", key: "passport" },
  { name: "Land Ownership Proof", key: "land" },
  { name: "Building Plan", key: "building" },
];

function getNextPendingStepIndex(completedDocuments) {
  const nextIndex = requiredDocuments.findIndex(
    (document) => !completedDocuments[document.key],
  );

  return nextIndex === -1 ? requiredDocuments.length : nextIndex;
}

const requiredDocs = ["aadhaar", "pan", "passport"];

function buildUploadItems(files, documentType) {
  return files.map((file) => ({
    id: `${file.name}-${file.lastModified}`,
    name: file.name,
    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    progress: 0,
    status: acceptedTypes.includes(file.type) ? "uploading" : "error",
    error: acceptedTypes.includes(file.type) ? "" : "Only PDF and DOCX files are supported.",
    extractedData: null,
    file,
    documentType,
  }));
}

export function UploadArea({ files, sessionId, setFiles, onOpenSidebar }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [uploadedTypes, setUploadedTypes] = useState([]);

  const currentDocument = requiredDocuments[currentStep];
  const isCompleted = currentStep >= requiredDocuments.length;
  const completedCount = Object.keys(uploadedDocuments).length;

  const missingDocs = requiredDocs.filter(
    doc => !uploadedTypes.includes(doc)
  );

  const queued = useMemo(
    () => files.filter((file) => file.status !== "success").length,
    [files],
  );

  const updateFile = (fileId, updates) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === fileId ? { ...entry, ...updates } : entry,
      ),
    );
  };

  const uploadFile = async (item) => {
    try {
      updateFile(item.id, { progress: 25 });

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("session_id", sessionId);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      const data = await response.json();

      updateFile(item.id, {
        progress: 100,
        status: "success",
        extractedData: data,
      });

      // Mark document as completed and move to the next pending step.
      setUploadedDocuments((prev) => {
        const nextUploadedDocuments = {
          ...prev,
          [item.documentType.key]: true,
        };

        setCurrentStep(getNextPendingStepIndex(nextUploadedDocuments));

        return nextUploadedDocuments;
      });

      // Track uploaded document types
      if (data.type) {
        setUploadedTypes(prev => [...new Set([...prev, data.type.toLowerCase()])]);
      }
 
    } catch (error) {
      updateFile(item.id, {
        progress: 0,
        status: "error",
        error: error.message || "Upload failed.",
      });
    }
  };

  const processUploads = (incomingFiles) => {
    if (isCompleted) return;

    const nextItems = buildUploadItems(incomingFiles, currentDocument);
    setFiles((current) => [...current, ...nextItems]);

    nextItems.forEach((item) => {
      if (item.status === "error") {
        return;
      }

      uploadFile(item);
    });
  };

  const renderDetails = (data) => {
    const detailItems = Object.entries(data)
      .filter(([key]) => key !== "type")
      .map(([key, value]) => ({
        label: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        value,
      }));

    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Type
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {detailItems.map((item) => (
            <div key={item.label}>
              <p className="mt-1 text-white">
                {typeof item.label === "string" &&
                (item.label.toLowerCase().includes("aadhaar") ||
                  item.label.toLowerCase().includes("pan"))
                  ? maskSensitive(item.value)
                  : item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDocumentStep = (document, index) => {
    const isCurrent = index === currentStep;
    const isDocumentCompleted = uploadedDocuments[document.key];

    return (
      <motion.button
        key={document.key}
        type="button"
        layout
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        onClick={() => setCurrentStep(index)}
        className={`w-full rounded-3xl border p-4 text-left ${
          isCurrent
            ? "border-sky-400/60 bg-sky-400/10"
            : isDocumentCompleted
            ? "border-emerald-400/60 bg-emerald-400/10"
            : "border-white/[0.08] bg-slate-950/30"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-2xl p-3 ${
                isCurrent
                  ? "bg-sky-400/20 text-sky-300"
                  : isDocumentCompleted
                  ? "bg-emerald-400/20 text-emerald-300"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              {isDocumentCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  isCurrent
                    ? "text-white"
                    : isDocumentCompleted
                    ? "text-emerald-300"
                    : "text-slate-400"
                }`}
              >
                {document.name}
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {isDocumentCompleted ? "Completed" : isCurrent ? "Current step" : "Pending"}
              </p>
            </div>
          </div>
          {isCurrent && !isDocumentCompleted ? (
            <ArrowRight className="h-5 w-5 text-sky-400" />
          ) : null}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Intake
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Upload documents
          </h3>
          {!isCompleted ? (
            <p className="mt-2 text-sm text-slate-400">
              Step {currentStep + 1} of {requiredDocuments.length}: Upload {currentDocument.name}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 lg:hidden"
          onClick={onOpenSidebar}
        >
          Menu
        </button>
      </div>

      {/* Progress Overview */}
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Document Progress</h4>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            {completedCount} of {requiredDocuments.length} completed
          </span>
        </div>
        <div className="space-y-3">
          {requiredDocuments.map((doc, index) => renderDocumentStep(doc, index))}
        </div>
      </div>

      {!isCompleted ? (
        <motion.div
          layout
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            processUploads(Array.from(event.dataTransfer.files));
          }}
          className={[
            "relative overflow-hidden rounded-[32px] border border-dashed p-10 text-center shadow-glow backdrop-blur-xl transition",
            isDragging
              ? "border-sky-400/60 bg-sky-400/10"
              : "border-white/10 bg-white/[0.04]",
          ].join(" ")}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-400/10" />
          <div className="relative">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-sky-300"
            >
              <Inbox className="h-7 w-7" />
            </motion.div>
            <h4 className="mt-6 text-xl font-semibold text-white">
              Upload {currentDocument.name}
            </h4>
            <p className="mt-3 text-sm text-slate-400">
              Drag and drop your {currentDocument.name} document, or browse to add the file for
              processing.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => inputRef.current?.click()}
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-sky-500/30"
              >
                Browse files
              </motion.button>
              <span className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                {queued} active upload{queued === 1 ? "" : "s"}
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(event) => processUploads(Array.from(event.target.files || []))}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="rounded-[32px] border border-emerald-400/60 bg-emerald-400/10 p-10 text-center shadow-glow backdrop-blur-xl"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/20 text-emerald-300"
            >
              <CheckCircle2 className="h-7 w-7" />
            </motion.div>
            <h4 className="mt-6 text-xl font-semibold text-white">
              All documents uploaded!
            </h4>
            <p className="mt-3 text-sm text-slate-400">
              Your document submission is complete. You can now proceed with the next steps.
            </p>
          </div>
        </motion.div>
      )}

      {/* Document Status */}
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-soft backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-white">Document status</h4>
            <p className="mt-1 text-sm text-slate-400">
              Track which required documents have been uploaded and processed.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            {uploadedTypes.length} of {requiredDocs.length} uploaded
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {requiredDocs.map(doc => (
            <div key={doc} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/30 p-4">
              <div className={`rounded-full p-2 ${
                uploadedTypes.includes(doc)
                  ? "bg-emerald-400/20 text-emerald-300"
                  : "bg-rose-400/20 text-rose-300"
              }`}>
                {uploadedTypes.includes(doc) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  uploadedTypes.includes(doc) ? "text-emerald-300" : "text-rose-300"
                }`}>
                  {doc.toUpperCase()}
                </p>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  {uploadedTypes.includes(doc) ? "Uploaded" : "Missing"}
                </p>
              </div>
            </div>
          ))}
        </div>
        {missingDocs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="text-sm text-amber-200">
              ⚠️ Please upload remaining documents to continue with your application.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-soft backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Upload queue</h4>
            <p className="mt-1 text-sm text-slate-400">
              Every file is validated before it enters the processing pipeline.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
        </div>

        {files.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-slate-950/20 p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-4 text-sm text-slate-400">
              No documents yet. Upload a packet to see progress, previews, and processing states.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <AnimatePresence initial={false}>
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-3xl border border-white/[0.08] bg-slate-950/30 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-white/5 p-3 text-sky-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          {file.size} • {typeof file.documentType === "string" ? file.documentType : file.documentType.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {file.status === "success" ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Uploaded
                        </span>
                      ) : null}
                      {file.status === "uploading" ? (
                        <span className="rounded-full bg-sky-400/10 px-3 py-1 text-sky-300">
                          Processing
                        </span>
                      ) : null}
                      {file.status === "error" ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-rose-400/10 px-3 py-1 text-rose-300">
                          <AlertCircle className="h-4 w-4" />
                          Error
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {file.status !== "error" ? (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                          animate={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-rose-300">{file.error}</p>
                  )}

                  {file.status === "success" && file.extractedData
                    ? renderDetails(file.extractedData)
                    : null}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
