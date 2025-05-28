from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
import uuid, io, tempfile, os, re, requests
from docx import Document
from pdf2docx import Converter
from dotenv import load_dotenv
from pathlib import Path

root = Path(__file__).resolve().parent.parent
env_path = root / ".env.local"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Please set GEMINI_API_KEY in your .env.local")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MANDATORY_FRONT_MATTER = {
    "Naslovna stran na platnici": [],  # validated via specialized function
    "Notranja naslovna stran v zaključnem delu": [],  # validated via specialized function
    "Naslednja notranja naslovna stran": [r"naslov(na)? stran", r"univerza", r"fakulteta"],
    "Zahvala": [r"\bzahvala\b"],
    "Povzetek SI": [r"\bpovzetek\b", r"ključne besede", r"udk"],
    "Povzetek EN": [r"\babstract\b", r"keywords", r"udc"],
    "Izjava o avtorstvu": [r"izjava o avtorstvu"],
    "Kazalo vsebine": [r"kazalo vsebine"],
    "Kazalo slik": [r"kazalo slik"],
    "Kazalo grafov": [r"kazalo grafov"],
    "Kazalo tabel": [r"kazalo tabel"],
    "Seznam simbolov in kratic": [r"seznam.*simbol", r"seznam.*kratic", r"uporabljene.*kratice"],
    "Vsebina zaključnega dela": [r"\buvod\b", r"^1\\."],
    "Seznam virov in literature": [r"viri in literatura", r"seznam virov"],
    "Priloge": [r"priloge"],
}

# Patterns for specialized validators
NAME_PATTERN = re.compile(r"^[A-ZČŠĐŽ][a-zčšđž]+(?:\s+[A-ZČŠĐŽ][a-zčšđž]+)+$")
TYPE_PATTERN = re.compile(r"\b(Magistrsko delo|Diplomsko delo|Doktorska disertacija|Kandidatensko delo)\b", re.IGNORECASE)
CITYDATE_PATTERN = re.compile(
    r"^[A-ZČŠĐŽ][a-zčšđžščž]+,\s*(?:januar|februar|marec|april|maj|junij|julij|avgust|september|oktober|november|december)\s+\d{4}$",
    re.IGNORECASE
)

# Patterns for body sections
SUBSECTION_PATTERNS = [r"cilj", r"predpostavk", r"raziskovaln", r"omejit"]
SECTION_PATTERNS = {
    "Uvod": r"^\d+\.\s*UVOD|^UVOD",
    "Pregled literature": r"^\d+\.\s*Pregled literature|^Pregled literature",
    "Metodologija": r"^\d+\.\s*Metodologija|^Metodologija",
    "Rezultati": r"^\d+\.\s*Rezultati|^Rezultati",
    "Zaključek": r"^\d+\.\s*(?:Zaključek|Sklep)|^(?:Zaključek|Sklep)"
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
    missing = [sec for sec, ok in front.items() if not ok]
    uvod = _extract_uvod(paragraphs)
    body = _check_body_sections(paragraphs)
    missing_body = [sec for sec, ok in body.items() if not ok]

    return JSONResponse({
        "paragraphs": paragraphs,
        "front_matter_found": front,
        "missing_sections": missing,
        "table_of_contents": toc,
        "uvod": uvod,
        "body_sections_found": body,
        "missing_body_sections": missing_body
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
    missing = [sec for sec, ok in front.items() if not ok]
    uvod = _extract_uvod(paragraphs)
    body = _check_body_sections(paragraphs)
    missing_body = [sec for sec, ok in body.items() if not ok]

    return JSONResponse({
        "paragraphs": paragraphs,
        "front_matter_found": front,
        "missing_sections": missing,
        "table_of_contents": toc,
        "uvod": uvod,
        "body_sections_found": body,
        "missing_body_sections": missing_body
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
        if section == "Naslovna stran na platnici":
            found = _validate_naslovna_stran(paragraphs)
        elif section == "Notranja naslovna stran v zaključnem delu":
            found = _validate_notranja_stran(paragraphs)
        else:
            found = any(
                any(re.search(pat, p["content"], re.IGNORECASE) for pat in patterns)
                for p in paragraphs
            )
        result[section] = found
    return result


def _check_body_sections(paragraphs):
    result = {}
    # Check introduction exists and has subsections
    uvod = _extract_uvod(paragraphs)
    uvod_ok = bool(uvod) and all(any(re.search(pat, line, re.IGNORECASE) for line in uvod) for pat in SUBSECTION_PATTERNS)
    result["Uvod (s podsekcijami)"] = uvod_ok
    # Check other body sections by heading
    for name, pattern in SECTION_PATTERNS.items():
        found = any(re.search(pattern, p['content'], re.IGNORECASE) for p in paragraphs)
        result[name] = found
    return result


def _validate_naslovna_stran(paragraphs):
    block = [p['content'].strip() for p in paragraphs if p['content'].strip()][:6]
    name_ok = any(NAME_PATTERN.match(line) for line in block)
    type_ok = any(TYPE_PATTERN.search(line) for line in block)
    date_ok = any(CITYDATE_PATTERN.match(line) for line in block)
    title_ok = any(
        len(line) > 10 and not NAME_PATTERN.match(line)
        and not TYPE_PATTERN.search(line)
        and not CITYDATE_PATTERN.match(line)
        for line in block
    )
    return all([name_ok, title_ok, type_ok, date_ok])


def _validate_notranja_stran(paragraphs):
    # Simple checks for key labels
    type_ok = any(TYPE_PATTERN.search(p['content']) for p in paragraphs)
    student_ok = any("Študent(ka):" in p['content'] for p in paragraphs)
    program_ok = any("Študijski program:" in p['content'] for p in paragraphs)
    smer_ok = any("Smer:" in p['content'] for p in paragraphs)
    mentor_ok = any("Mentor(ica):" in p['content'] for p in paragraphs)
    lektor_ok = any("Lektor(ica):" in p['content'] for p in paragraphs)
    return all([type_ok, student_ok, program_ok, smer_ok, mentor_ok, lektor_ok])


def _extract_toc(paragraphs):
    toc = []
    in_toc = False
    entry_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)
        (?:\.)?[\s\t]+
        (?P<title>.*?)
        \s*\.{2,}\s*
        (?P<page>\d+)\s*$
    """, re.VERBOSE)
    end_sections = re.compile(r"^(kazalo slik|kazalo tabel|seznam virov|priloge)", re.IGNORECASE)
    for p in paragraphs:
        txt = p['content']
        if not in_toc:
            if re.search(r"kazalo vsebine", txt, re.IGNORECASE):
                in_toc = True
            continue
        if end_sections.match(txt):
            break
        m = entry_re.match(txt)
        if m:
            num = m.group('num')
            level = num.count('.') + 1
            toc.append({'number': num, 'title': m.group('title').strip(), 'level': level})
    return toc


def _apply_toc_styles(paragraphs, toc):
    # Merge references
    merged = []
    ref_re = re.compile(r"^\[\d+\]")
    curr = None
    for p in paragraphs:
        if ref_re.match(p['content']):
            if curr is not None:
                merged.append(curr)
            curr = p.copy()
        else:
            if curr is not None:
                curr['content'] += ' ' + p['content']
            else:
                merged.append(p)
    if curr is not None:
        merged.append(curr)
    paragraphs = merged

    # Remove standalone page numbers
    paragraphs = [p for p in paragraphs if not re.fullmatch(r"\d+", p['content'].strip())]

    # Caption style
    caption_re = re.compile(r"^(Slika|Tabela)\s*\d+:", re.IGNORECASE)
    for p in paragraphs:
        if caption_re.match(p['content']):
            p['style'] = 'Caption'

    # Heading styles
    level_map = {(e['number'], e['title']): e['level'] for e in toc}
    head_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)
        \.?\s+
        (?P<title>.*?)
        \s*\.{2,}\s*\d+\s*$
    """, re.VERBOSE)
    simple_re = re.compile(r"""
        ^\s*
        (?P<num>\d+(?:\.\d+)*)
        \.?
        (?=[^.\s])
        (?P<title>.+)$
    """, re.VERBOSE)
    styled = []
    for p in paragraphs:
        if p.get('style') == 'Caption':
            styled.append(p)
            continue
        txt = p['content']
        m = head_re.match(txt)
        if m:
            num, title = m.group('num'), m.group('title').strip()
            lvl = level_map.get((num, title), num.count('.') + 1)
            p['style'] = f'Heading {lvl}'
        else:
            m2 = simple_re.match(txt)
            if m2:
                num, title = m2.group('num'), m2.group('title').strip()
                if (num, title) in level_map:
                    lvl = level_map[(num, title)]
                    p['style'] = f'Heading {lvl}'
                elif title.isupper():
                    p['style'] = f'Heading {num.count('.')+1}'
                elif num.count('.') >= 2:
                    p['style'] = f'Heading {num.count('.')+1}'
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