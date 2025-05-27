import React, { useState } from "react"

export default function DocumentUploader({ onResult }) {
  const [error, setError] = useState(null)
  const handleFile = async (e) => {
    setError(null)
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append("file", file)
    const isPDF = file.name.toLowerCase().endsWith(".pdf")
    try {
      const res = await fetch(isPDF ? "/upload-pdf" : "/upload-docx", {
        method: "POST",
        body: form
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }
      const json = await res.json()
      onResult(json)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="mb-6">
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
        className="mb-2"
      />
      {error && <div className="text-red-600">Error: {error}</div>}
    </div>
  )
}