from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
import uuid, io, tempfile, os, re, requests
from docx import Document
from pdf2docx import Converter
from dotenv import load_dotenv
from pathlib import Path
import re

# Load environment variables
root = Path(__file__).resolve().parent.parent
env_path = root / ".env.local"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Please set GEMINI_API_KEY in your .env.local")

# Initialize FastAPI with CORS
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mandatory front-matter sections and their matching patterns
MANDATORY_FRONT_MATTER = {
    "Naslovna stran": [r"naslov", r"studenta", r"program"],
    "Zahvala": [r"zahvala"],
    "Povzetek SI": [r"povzetek", r"ključne besede", r"udk"],
    "Povzetek EN": [r"abstract", r"keywords", r"udc"],
    "Kazalo vsebine": [r"kazalo vsebine"],
    "Kazalo slik": [r"kazalo slik"],
    "Kazalo tabel": [r"kazalo tabel"],
    "Seznam virov": [r"viri in literatura", r"seznam virov"],
    "Priloge": [r"priloge"],
    "Izjave": [r"izjava o avtorstvu", r"izjava"]
}

@app.get("/", response_class=HTMLResponse)
def index():
    return """
<html><body>
  <input type=\"file\" id=\"file\"
         accept=\"application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document\"
         onchange=\"upload(this.files[0])\"> 
  <pre id=\"output\"></pre>
  <script>
    async function upload(f) {
      const out = document.getElementById('output');
      let fd = new FormData(); fd.append('file', f);
      let url = f.name.toLowerCase().endsWith('.pdf') ? '/upload-pdf' : '/upload-docx';
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
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Please upload a DOCX file.")
    data = await file.read()
    try:
        doc = Document(io.BytesIO(data))
    except Exception as e:
        raise HTTPException(400, f"Error reading DOCX: {e}")

    paragraphs = _extract_paragraphs(doc)
    toc = _extract_toc(paragraphs)
    paragraphs = _apply_toc_styles(paragraphs, toc)
    front = _check_front_matter(paragraphs)
    uvod = _extract_uvod(paragraphs)

    return JSONResponse({
        "paragraphs": paragraphs,
        "front_matter_check": front,
        "table_of_contents": toc,
        "uvod": uvod
    })

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        pdf_path = tmp.name

    docx_path = pdf_path[:-4] + ".docx"
    try:
        conv = Converter(pdf_path)
        conv.convert(docx_path)
        conv.close()
    except Exception as e:
        os.unlink(pdf_path)
        raise HTTPException(500, f"Conversion failed: {e}")

    try:
        doc = Document(docx_path)
    except Exception as e:
        raise HTTPException(500, f"Error reading converted DOCX: {e}")
    finally:
        os.unlink(pdf_path)
        os.unlink(docx_path)

    paragraphs = _extract_paragraphs(doc)
    toc = _extract_toc(paragraphs)
    paragraphs = _apply_toc_styles(paragraphs, toc)
    front = _check_front_matter(paragraphs)
    uvod = _extract_uvod(paragraphs)

    return JSONResponse({
        "paragraphs": paragraphs,
        "front_matter_check": front,
        "table_of_contents": toc,
        "uvod": uvod
    })

@app.get("/ai")
def ai_check():
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        f"?key={GEMINI_API_KEY}"
    )
    body = {"contents":[{"parts":[{"text":"..."}]}]}
    resp = requests.post(url, json=body, headers={"Content-Type":"application/json"})
    if not resp.ok:
        raise HTTPException(resp.status_code, f"Gemini API error: {resp.text}")
    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", "")
    return JSONResponse({"ai_response": text})

# Helper functions

def _extract_paragraphs(doc: Document):
    out = []
    for para in doc.paragraphs:
        txt = para.text.strip()
        if txt:
            out.append({
                "id": str(uuid.uuid4()),
                "style": para.style.name,
                "content": txt
            })
    return out


def _check_front_matter(paragraphs):
    result = {}
    for section, patterns in MANDATORY_FRONT_MATTER.items():
        found = any(
            any(re.search(pat, p["content"], re.IGNORECASE) for pat in patterns)
            for p in paragraphs
        )
        result[section] = found
    return result


def _extract_toc(paragraphs):
    toc = []
    in_toc = False

    # Match either “1.2.” or “1.2␣” before the title
    entry_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)        # 1, 1.1, 1.2, etc.
        (?:\.)?[\s\t]+                # optional dot, then space or tab
        (?P<title>.*?)                # heading text
        \s*\.{2,}\s*                  # at least two dots before page#
        (?P<page>\d+)\s*$             # page number
    """, re.VERBOSE)

    # Stop as soon as we hit the next index (e.g. “Kazalo slik”, “Priloge”…)
    end_sections = re.compile(
        r"^(kazalo slik|kazalo tabel|seznam virov|priloge)",
        re.IGNORECASE
    )

    for p in paragraphs:
        txt = p["content"]
        if not in_toc:
            if re.search(r"kazalo vsebine", txt, re.IGNORECASE):
                in_toc = True
            continue

        if end_sections.match(txt):
            break

        m = entry_re.match(txt)
        if m:
            num   = m.group("num")
            level = num.count('.') + 1
            toc.append({
                "number": num,
                "title":  m.group("title").strip(),
                "level":  level
            })

    return toc


import re

def _apply_toc_styles(paragraphs, toc):
    # Remove standalone page-number paragraphs (digits only)
    paragraphs = [p for p in paragraphs if not re.fullmatch(r"\d+", p["content"].strip())]

    # Build lookup: (number, title) → level
    level_map = {
        (entry["number"], entry["title"]): entry["level"]
        for entry in toc
    }

    # 1) ToC-style entries: require dot leaders and a page number
    head_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)      # 1 or 1.2 or 2.3.4
        \.?\s+                       # optional dot, then at least one space
        (?P<title>.*?)                # heading text
        \s*\.{2,}\s*\d+\s*$       # at least two dots + page number
    """, re.VERBOSE)

    # 2) Simple numbered prefix: match numeric sections
    simple_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)     # e.g. 3 or 4.2 etc.
        \.?                           # optional trailing dot
        (?=[^\.\s])                  # next char not dot/space
        (?P<title>.+)                  # the rest of the line
        $
    """, re.VERBOSE)

    styled = []
    for p in paragraphs:
        txt = p["content"]

        # 1. ToC-style entries get headings
        m = head_re.match(txt)
        if m:
            num = m.group("num")
            title = m.group("title").strip()
            lvl = level_map.get((num, title), num.count('.') + 1)
            p["style"] = f"Heading {lvl}"
        else:
            # 2. Fallback: simple numbered or uppercase-based headings
            m2 = simple_re.match(txt)
            if m2:
                num = m2.group("num")
                title = m2.group("title").strip()
                # Use ToC level if available
                if (num, title) in level_map:
                    lvl = level_map[(num, title)]
                    p["style"] = f"Heading {lvl}"
                # Uppercase titles for headings
                elif title.upper() == title:
                    lvl = num.count('.') + 1
                    p["style"] = f"Heading {lvl}"
                # Nested numeric sections (>= 3rd level)
                elif num.count('.') >= 2:
                    lvl = num.count('.') + 1
                    p["style"] = f"Heading {lvl}"

        styled.append(p)

    return styled

def _extract_uvod(paragraphs):
    uvod = []
    in_sec = False
    for p in paragraphs:
        c = p['content']
        if re.match(r"^\d+\.\s+UVOD", c, re.IGNORECASE) or c.strip().upper() == "UVOD":
            in_sec = True
            continue
        if in_sec and re.match(r"^\d+\.\s+", c):
            break
        if in_sec:
            uvod.append(c)
    return uvod
