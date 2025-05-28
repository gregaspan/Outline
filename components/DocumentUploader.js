import React, { useState, useRef } from "react";

const API_BASE = "http://127.0.0.1:8000";

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
      setError(err.message || "Prišlo je do napake.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Naloži dokument (.pdf / .docx)</label>
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
          Nalaganje...
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-error">
          Napaka: {error}
        </div>
      )}
    </div>
  );
}