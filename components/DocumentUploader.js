import React, { useState, useRef } from "react";

const API_BASE = "https://outline-api.onrender.com";

export default function DocumentUploader({ onResult }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
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

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".docx"))) {
      handleFile(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleInputChange}
        disabled={loading}
        className="hidden"
      />
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
          ${loading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {loading ? (
          <div className="py-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Processing document...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload your document
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop your PDF or DOCX file here, or click to browse
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded-full">PDF</span>
              <span className="px-2 py-1 bg-gray-100 rounded-full">DOCX</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
          <p className="text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </p>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 text-lg">💡</div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Need inspiration?
            </h4>
            <p className="text-sm text-blue-700 mb-2">
              Check out this example of a well-structured thesis for reference.
            </p>
            <a
              href="https://dk.um.si/Dokument.php?id=171176&lang=slv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View example thesis
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}