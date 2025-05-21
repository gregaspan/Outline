from fastapi import FastAPI, UploadFile, File, HTTPException
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
    front = _check_front_matter(paragraphs)
    toc = _extract_toc(paragraphs)
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
    front = _check_front_matter(paragraphs)
    toc = _extract_toc(paragraphs)
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
    body = {
"contents": [
    {"parts": [{"text": """Uvod mora biti napisan po teh navodilih: Prvi odstavek uvoda se začne s kratko predstavitvijo širšega in zatem ožjega področja. Navedite, zakaj je pomembno. V drugem odstavku opišite problem in raziskovalna vprašanja oz. cilje.  V tretjem odstavku navedite, kaj boste naredili v projektu v zvezi z zastavljenimi raziskovalnimi vprašanji oz. cilji. Četrti odstavek vključuje kratko napoved vsebine nadaljnjih poglavij. 
                Uvod ima samo te štiri odstavke in naj bo dolg stran ali dve. Naj ne bo razdeljen na podpoglavja. Pandemija COVID-19 je leta 2020 močno preoblikovala način dela v številnih panogah, še posebej v sektorju informacijske tehnologije (IT). Čez noč so se morala podjetja prilagoditi delu na daljavo, kar je pomenilo velik preskok v načinu vodenja projektov in vključevanja ekip. Delo od doma je postalo “nova resničnost” za milijone delavcev po svetu, projektni vodje pa so se znašli pred izzivom, kako na daljavo učinkovito voditi projekte in hkrati ohranjati povezane in motivirane delovne skupine. V IT sektorju, kjer so ekipe pogosto geografsko razpršene in so projekti kompleksni, je razvoj dobrih praks za vodenje na daljavo ključnega pomena.
V tej raziskovalni projektni nalogi se osredotočamo na dobre prakse vključevanja in vodenja projektov na daljavo v obdobju po letu 2020, s poudarkom na vlogi vodij projektov v IT. Posebej nas zanimajo spremembe, ki sta jih sprožili pandemija in pospešena digitalizacija, ter kako so uspešna podjetja to izkoristila v svoj prid. Raziskali bomo teoretsko ozadje fenomena dela na daljavo, identificirali izzive ter predstavili učinkovite pristope in metode za vodenje razpršenih ekip. Pri tem bomo uporabili primere znanih podjetij, kot so GitLab, Zapier in Atlassian, ki veljajo za pionirje oziroma zgledne primere oddaljenega dela v industriji. 
                Your writing style should be concise, direct, friendly, and sound like a real human quickly dashing off a note
                Give me feedback about my uvod, please do not write your version but give me feedback on what to improve, no examples please
"""} ]}
        ]
    }
    resp = requests.post(url, json=body, headers={"Content-Type": "application/json"})
    if not resp.ok:
        raise HTTPException(resp.status_code, f"Gemini API error: {resp.text}")
    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", "")
    return JSONResponse({"ai_response": text})


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
    for p in paragraphs:
        text = p["content"]
        if not in_toc:
            if re.search(r"kazalo vsebine", text, re.IGNORECASE):
                in_toc = True
            continue
        if re.match(r"^[A-ZČŠŽ][^\.]{2,}$", text) and not re.search(r"\.{2,}", text):
            break
        m = re.match(r"^\s*(\d+(?:\.\d+)*)\.\s+(.*?)\s*\.{2,}\s*\d+", text)
        if m:
            toc.append({
                "number": m.group(1),
                "title": m.group(2).strip()
            })
    return toc


def _extract_uvod(paragraphs):
    uvod = []
    in_sec = False
    for p in paragraphs:
        c = p["content"]
        if re.match(r"^\d+\.\s+UVOD", c, re.IGNORECASE) or c.strip().upper() == "UVOD":
            in_sec = True
            continue
        if in_sec and re.match(r"^\d+\.\s+", c):
            break
        if in_sec:
            uvod.append(c)
    return uvod