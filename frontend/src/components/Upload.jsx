import { useState } from "react";

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select a file.");
      setResult(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setError("");

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
  };
  function maskSensitive(value) {
  if (!value) return "";

  const str = value.toString().replace(/\s/g, "");
  const last4 = str.slice(-4);
  const masked = str.slice(0, -4).replace(/./g, "X");

  return (masked + last4).replace(/(.{4})/g, "$1 ").trim();
}

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />
        <button type="submit">Upload</button>
      </form>

      {error && <p>{error}</p>}

      {result && (
        <div>
          <p>Name: {result.name}</p>
<p>DOB: {result.dob}</p>
<p>Address: {result.address}</p>

<p>Aadhaar: {maskSensitive(result.aadhaar)}</p>
<p>PAN: {maskSensitive(result.pan)}</p>
        </div>
      )}
    </div>
  );
}
