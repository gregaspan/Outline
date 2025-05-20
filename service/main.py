from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
import uuid, io, tempfile, os, re
from docx import Document
from pdf2docx import Converter

app = FastAPI()

REQUIRED_SECTIONS = {
    "Uvod": [r"cilj", r"cilji", r"namen tega dela", r"namen tega dela je", r"predpostav", r"raziskovaln", r"omejitev"],
    "Pregled literature": [r"pregled literature", r"reference", r"navaj"],
    "Metodologija": [r"metodolog"],
    "Rezultati": [r"rezultat"],
    "Zaključek": [r"zaključek"]
}

SECTION_ALIASES = {
    "Pregled literature": [r"pregled literature", r"viri in literatura"]
}

INTRO_SUBCOMPONENTS = {
    "Jasno izraženi cilji": [r"namen tega dela je", r"cilj naloge"],
    "Izpostavljene predpostavke": [r"predpostavk", r"predpostavka"],
    "Opredeljena raziskovalna vprašanja": [r"raziskovaln(a|o) vprašanj(e)?"],
    "Določena območja in omejitve": [r"omejit(e)?"],
}

EXPECTED_ORDER = [
    "Naslovna stran", "Zahvala", "Povzetek SI", "Povzetek EN", "Kazalo vsebine",
    "Kazalo slik", "Kazalo tabel", "Uvod", "Pregled literature", "Metodologija",
    "Rezultati", "Zaključek", "Seznam virov", "Priloge", "Izjave"
]

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
        raise HTTPException(400, "Upload a DOCX file.")
    data = await file.read()
    try:
        doc = Document(io.BytesIO(data))
    except Exception as e:
        raise HTTPException(400, f"Error reading DOCX: {e}")
    paragraphs = _extract_paragraphs(doc)
    structure = _analyze_structure_and_order(paragraphs)
    front = _check_front_matter(paragraphs)
    intro = _analyze_introduction_components(paragraphs)
    return JSONResponse({
        "paragraphs": paragraphs,
        "structure_analysis": structure,
        "front_matter_check": front,
        "introduction_components": intro
    })

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Upload a PDF file.")
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
        tmp_pdf.write(await file.read())
        tmp_pdf_path = tmp_pdf.name
    tmp_docx_path = tmp_pdf_path[:-4] + ".docx"
    try:
        conv = Converter(tmp_pdf_path)
        conv.convert(tmp_docx_path)
        conv.close()
    except Exception as e:
        os.unlink(tmp_pdf_path)
        raise HTTPException(500, f"PDF→DOCX conversion failed: {e}")
    try:
        doc = Document(tmp_docx_path)
    except Exception as e:
        raise HTTPException(500, f"Error reading converted DOCX: {e}")
    finally:
        os.unlink(tmp_pdf_path)
        os.unlink(tmp_docx_path)
    paragraphs = _extract_paragraphs(doc)
    structure = _analyze_structure_and_order(paragraphs)
    front = _check_front_matter(paragraphs)
    intro = _analyze_introduction_components(paragraphs)
    return JSONResponse({
        "paragraphs": paragraphs,
        "structure_analysis": structure,
        "front_matter_check": front,
        "introduction_components": intro
    })


def _extract_paragraphs(doc: Document):
    out = []
    for para in doc.paragraphs:
        txt = para.text.strip()
        if not txt:
            continue
        out.append({
            "id": str(uuid.uuid4()),
            "style": para.style.name,
            "content": txt
        })
    return out


def _analyze_structure_and_order(paragraphs):
    found_order = []
    sections = {name: {'present': False, 'content': []} for name in REQUIRED_SECTIONS}
    current = None
    total_checks = 0
    passed_checks = 0

    for p in paragraphs:
        txt = p['content']
        # Detect headings by style or uppercase start
        if 'Heading' in p['style'] or re.match(r'^[A-ZČŠŽ].{2,}$', txt):
            # Record order for expected sections
            for title in EXPECTED_ORDER:
                if re.search(re.escape(title), txt, re.IGNORECASE):
                    found_order.append(title)
            # Assign current section based on aliases and names
            found_section = None
            for name in sections:
                patterns = SECTION_ALIASES.get(name, [name])
                for pat in patterns:
                    if re.search(pat, txt, re.IGNORECASE):
                        found_section = name
                        sections[name]['present'] = True
                        break
                if found_section:
                    break
            current = found_section
            continue
        # Capture content under current section
        if current:
            sections[current]['content'].append(txt)
    results = {}
    for name, kws in REQUIRED_SECTIONS.items():
        info = {'section_present': sections[name]['present'], 'keywords': {}}
        # Section presence check
        total_checks += 1
        if sections[name]['present']:
            passed_checks += 1
        # Keyword checks
        for kw in kws:
            total_checks += 1
            found = any(re.search(kw, line, re.IGNORECASE) for line in sections[name]['content'])
            info['keywords'][kw] = found
            if found:
                passed_checks += 1
        results[name] = info
    score = int(passed_checks / total_checks * 100) if total_checks else 0
    # Validate logical order
    order_ok = True
    if len(found_order) > 1:
        order_ok = all(
            EXPECTED_ORDER.index(found_order[i]) < EXPECTED_ORDER.index(found_order[i+1])
            for i in range(len(found_order) - 1)
        )
    return {
        'sections': results,
        'score': score,
        'passed_checks': passed_checks,
        'total_checks': total_checks,
        'found_order': found_order,
        'order_logical': order_ok
    }


def _analyze_introduction_components(paragraphs):
    intro_text = []
    in_intro = False
    for p in paragraphs:
        if 'Heading' in p['style'] and re.search(r"uvod", p['content'], re.IGNORECASE):
            in_intro = True
            continue
        if in_intro and 'Heading' in p['style'] and not re.search(r"uvod", p['content'], re.IGNORECASE):
            break
        if in_intro:
            intro_text.append(p['content'])
    components = {}
    for comp, kws in INTRO_SUBCOMPONENTS.items():
        found = any(re.search(kw, ' '.join(intro_text), re.IGNORECASE) for kw in kws)
        components[comp] = found
    return components


def _check_front_matter(paragraphs):
    checklist = {}
    for item, kws in MANDATORY_FRONT_MATTER.items():
        found = False
        for p in paragraphs:
            if any(re.search(kw, p['content'], re.IGNORECASE) for kw in kws):
                found = True
                break
        checklist[item] = found
    return checklist
