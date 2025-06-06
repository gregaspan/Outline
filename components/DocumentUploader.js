import React, { useState, useRef } from "react";

const API_BASE = "https://outline-api.onrender.com";

export default function DocumentUploader({ onResult }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    const form = new FormData();
    form.append("file", file);

    const endpoint = file.name.toLowerCase().endsWith(".pdf")
      ? "/upload-pdf"
      : "/upload-docx";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      onResult(data);
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Upload document (.pdf / .docx)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
        disabled={loading}
        className="file-input file-input-bordered w-full"
      />
      {loading && (
        <div className="flex items-center mt-2 text-gray-500">
          <span className="loading loading-spinner mr-2"></span>
          Loading...
        </div>
      )}
      {error && (
        <div className="mt-2 text-sm text-error">
          Error: {error}
        </div>
      )}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700 mb-2">
          💡 <strong>Example of a great thesis:</strong>
        </p>
        <p className="text-xs text-blue-600 mb-2">
          This is an example of a great thesis provided by the project owner:
        </p>
        <a
          href="https://dk.um.si/Dokument.php?id=171176&lang=slv"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
        >
          View example thesis →
        </a>
      </div>
    </div>
  );
}