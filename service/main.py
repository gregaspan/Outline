from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
import uuid, io
from PyPDF2 import PdfReader
from docx import Document

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def index():
    return """
<html><body>
  <input type=file id=file accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange="upload(this.files[0])">
  <pre id=output></pre>
  <script>
    async function upload(f) {
      const out = document.getElementById('output');
      let fd = new FormData(); fd.append('file', f);
      let url = '';
      // Detect by MIME type or extension
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        url = '/upload-pdf';
      } else if (f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name.toLowerCase().endsWith('.docx')) {
        url = '/upload-docx';
      } else {
        out.textContent = 'Unsupported file type';
        return;
      }
      try {
        let res = await fetch(url, { method:'POST', body:fd });
        if (!res.ok) throw new Error(await res.text());
        let j = await res.json();
        out.textContent = JSON.stringify(j, null, 2);
      } catch(e) {
        out.textContent = 'Error: '+e;
      }
    }
  </script>
</body></html>
"""

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Upload a PDF.")
    data = await file.read()
    reader = PdfReader(io.BytesIO(data))
    text = "\n".join(p.extract_text() or '' for p in reader.pages)

    # Paragraph logic
    lines = text.splitlines()
    pars = []
    cur = ""
    for l in lines:
        s = l.strip()
        if not s:
            if cur:
                pars.append(cur)
                cur = ''
        elif cur and s[0].isupper() and not cur.endswith('-'):
            pars.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}" if cur else s
    if cur:
        pars.append(cur)

    return JSONResponse([
        {"id": str(uuid.uuid4()), "type": "paragraph", "content": p}
        for p in pars
    ])

@app.post("/upload-docx")
async def upload_docx(file: UploadFile = File(...)):
    if file.content_type not in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"):
        raise HTTPException(400, "Upload a DOCX file.")
    data = await file.read()
    try:
        doc = Document(io.BytesIO(data))
    except Exception as e:
        raise HTTPException(400, f"Error reading DOCX: {e}")

    result = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        result.append({
            "id": str(uuid.uuid4()),
            "type": "paragraph",
            "style": para.style.name,
            "content": text
        })

    return JSONResponse(result)