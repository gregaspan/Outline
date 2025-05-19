from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
import uuid, io, tempfile, os
from docx import Document
from pdf2docx import Converter

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def index():
    return """
<html><body>
  <input type="file" id="file"
         accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
         onchange="upload(this.files[0])">
  <pre id="output"></pre>
  <script>
    async function upload(f) {
      const out = document.getElementById('output');
      let fd = new FormData();
      fd.append('file', f);

      let url;
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        url = '/upload-pdf';
      } else if (
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.name.toLowerCase().endsWith('.docx')
      ) {
        url = '/upload-docx';
      } else {
        out.textContent = 'Unsupported file type – please upload PDF or DOCX';
        return;
      }

      try {
        let res = await fetch(url, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        let j = await res.json();
        out.textContent = JSON.stringify(j, null, 2);
      } catch (e) {
        out.textContent = 'Error: ' + e;
      }
    }
  </script>
</body></html>
"""

@app.post("/upload-docx")
async def upload_docx(file: UploadFile = File(...)):
    # Validate DOCX upload
    if (
        file.content_type
        != "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        and not file.filename.lower().endswith(".docx")
    ):
        raise HTTPException(400, "Upload a DOCX file.")
    
    data = await file.read()
    try:
        doc = Document(io.BytesIO(data))
    except Exception as e:
        raise HTTPException(400, f"Error reading DOCX: {e}")

    return JSONResponse(_extract_paragraphs(doc))


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    # Validate PDF upload
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Upload a PDF file.")
    
    # Write PDF to a temp file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf.write(await file.read())
        tmp_pdf_path = tmp_pdf.name

    # Prepare temp output .docx path
    tmp_docx_path = tmp_pdf_path[:-4] + ".docx"
    
    # Convert PDF→DOCX
    try:
        conv = Converter(tmp_pdf_path)
        conv.convert(tmp_docx_path)  # all pages by default
        conv.close()
    except Exception as e:
        os.unlink(tmp_pdf_path)
        raise HTTPException(500, f"PDF→DOCX conversion failed: {e}")

    # Read the generated DOCX
    try:
        doc = Document(tmp_docx_path)
    except Exception as e:
        raise HTTPException(500, f"Error reading converted DOCX: {e}")
    finally:
        # clean up temp files
        os.unlink(tmp_pdf_path)
        os.unlink(tmp_docx_path)

    return JSONResponse(_extract_paragraphs(doc))


def _extract_paragraphs(doc: Document):
    """Helper: pull non‐empty paragraphs out of a python-docx Document."""
    out = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        out.append({
            "id": str(uuid.uuid4()),
            "type": "paragraph",
            "style": para.style.name,
            "content": text
        })
    return out