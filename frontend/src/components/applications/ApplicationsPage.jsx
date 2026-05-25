import { useMemo, useRef, useState } from "react";
import { runApplicationAgent, runFullAgent } from "../../agents/applicationAgent";
import { formSchemas } from "../../data/formSchemas";
import { generateDocxFile } from "../../utils/docxGenerator";
import { generateApplicationPDF } from "../../utils/generateDocument";
import { fillPdf } from "../../utils/formFiller";
import { ApplicationTracker } from "../upload/ApplicationTracker";

const applicationForms = [
  { type: "building", name: "Building Plan Application", link: "https://bbmp.gov.in" },
  { type: "electricity", name: "Electricity Connection", link: "https://bescom.karnataka.gov.in" },
  { type: "water", name: "Water Connection", link: "https://bwssb.karnataka.gov.in" },
];

const requiredDocuments = ["Aadhar", "PAN", "Passport"];

export default function ApplicationsPage({ permissionsInput, uploadedFiles }) {
  const inputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [filledFormType, setFilledFormType] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const availableFiles = useMemo(
    () => uploadedFiles.filter((file) => file.status === "success"),
    [uploadedFiles]
  );

  const currentStep = useMemo(() => {
    const completedDocuments = new Set(
      uploadedFiles
        .filter(
          (file) =>
            file.status === "success" &&
            requiredDocuments.includes(
              typeof file.documentType === "string"
                ? file.documentType
                : file.documentType?.name
            )
        )
        .map((file) =>
          typeof file.documentType === "string"
            ? file.documentType
            : file.documentType?.name
        )
    );

    return completedDocuments.size;
  }, [uploadedFiles]);

  const allFiles = selectedFiles.length > 0 ? selectedFiles : availableFiles;

  const handleFiles = (files) => {
    setSelectedFiles(Array.from(files));
    setIsReady(false);
    setDownloadUrl(null);
    setFilledFormType(null);
    setExtractedData(null);
    setError("");
  };

  const handleAutoFill = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await runFullAgent({
        goal: permissionsInput?.idea || "build house",
        uploadedFiles: allFiles,
        schemas: formSchemas,
      });

      setExtractedData(result.extractedData);
      setFilledFormType(result.formType);

      const schema = formSchemas[result.formType];
      const filledUrl = await fillPdf(schema.file, result.extractedData);
      setDownloadUrl(filledUrl);
      setIsReady(true);
    } catch (err) {
      setIsReady(false);
      setDownloadUrl(null);
      setFilledFormType(null);
      setError(err?.message || "Unable to generate the filled PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (form) => {
    if (!downloadUrl || filledFormType !== form.type) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${form.type}-filled.pdf`;
    anchor.click();
  };

  const handleDocxAutoFill = async () => {
    if (!extractedData) {
      return;
    }

    const agentResult = runApplicationAgent("generate building form", extractedData);

    if (agentResult.action === "GENERATE_DOCX") {
      await generateDocxFile(agentResult.payload);
    }
  };

  return (
    <div className="space-y-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Applications
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Start application process
        </h2>
      </div>

      <ApplicationTracker currentStep={currentStep} />

      <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Upload supporting files
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Add files here or reuse successfully uploaded documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            >
              Select Files
            </button>

            <button
              type="button"
              onClick={handleAutoFill}
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/15"
            >
              Auto Fill Using Agent
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files || [])}
        />

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
          {allFiles.length > 0
            ? `${allFiles.length} file(s) ready for application support`
            : "No files selected yet"}
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-200">
            <p>Agent is filling government form...</p>
            <p>Extracting user data...</p>
            <p>Mapping fields to application...</p>
            <p>Overlaying values on template...</p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-rose-300">{error}</p>
        ) : null}

        {extractedData ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-800 p-4">
            <p className="text-sm text-slate-400">Extracted Data</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {Object.entries(extractedData).map(([key, val]) => (
                <li key={key}>
                  <strong>{key}:</strong> {val}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isReady && downloadUrl ? (
          <p className="mt-3 text-green-400">
            Application form auto-filled successfully
          </p>
        ) : null}

        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={`${filledFormType || "application"}-filled.pdf`}
            className="mt-4 inline-block text-sm text-sky-300"
          >
            Download Filled Government Form -&gt;
          </a>
        ) : null}

        {extractedData ? (
          <button
            type="button"
            onClick={() => generateApplicationPDF(extractedData)}
            className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-400"
          >
            Generate AI Application Document
          </button>
        ) : null}

        {extractedData ? (
          <button
            type="button"
            onClick={handleDocxAutoFill}
            className="mt-3 ml-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
          >
            Auto Fill DOCX (Agent)
          </button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {applicationForms.map((form) => (
          <div
            key={form.name}
            className="rounded-3xl border border-white/10 bg-slate-950/30 p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{form.name}</h3>
                <a
                  href={form.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-sky-300"
                >
                  Open website
                </a>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(form)}
                disabled={!isReady || !downloadUrl || filledFormType !== form.type}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/10"
              >
                Download Form
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
