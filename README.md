# Kannada → Devanagari Transliteration Tool

A web app that converts **Kannada script** into **Devanagari script** (the script used for Marathi and Hindi). It accepts typed text, PDFs (digital and scanned) and photos, and keeps a per-user history.

> **This is transliteration, not translation.** The words stay Kannada; only the script changes.
> Example: `ಕರ್ನಾಟಕ` → `कर्नाटक`

---

## Table of Contents

1. [Features](#features)
2. [How It Works](#how-it-works)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Firebase Setup (Login + History)](#firebase-setup-login--history)
9. [Environment Variables](#environment-variables)
10. [Running Locally](#running-locally)
11. [API Reference](#api-reference)
12. [Override Dictionary](#override-dictionary)
13. [Testing](#testing)
14. [Deployment (Free Tier)](#deployment-free-tier)
15. [Free-Tier Limits and Safeguards](#free-tier-limits-and-safeguards)
16. [Known Issues](#known-issues)
17. [Troubleshooting](#troubleshooting)
18. [Roadmap](#roadmap)
19. [Credits](#credits)

---

## Features

- **Text mode:** Kannada in, Devanagari out, with copy and download (.txt)
- **PDF mode:** digital PDFs are read directly; scanned pages fall back to OCR automatically. Results are shown page by page. Export as .txt or .docx
- **Image mode:** upload a file or capture with the phone camera. OCR runs first, then you **review and edit** the extracted text before converting
- **Override dictionary:** force preferred spellings for names and places (for example Bengaluru, Mysuru)
- **History:** every conversion is saved to your account and shown in a sidebar, like ChatGPT
- **Login:** Google sign-in, with optional guest (anonymous) use
- **Mobile friendly:** responsive layout, camera capture, proper Kannada and Devanagari fonts
- **Deterministic:** no LLM does the conversion, so the same input always gives the same output

---

## How It Works

```
Input (Text / PDF / Image)
        │
        ▼
 Input router ──► Digital PDF ──► PyMuPDF text extraction
        │                              │
        │         Scanned PDF / Image  │
        └────────► OpenCV preprocessing ──► Tesseract OCR (kan)
                                       │
                         (user reviews and edits OCR text)
                                       ▼
                    Unicode NFC normalization
                                       ▼
                    Override dictionary lookup
                                       ▼
                    Aksharamukha (Kannada → Devanagari)
                                       ▼
                    Post-processing + NFC normalization
                                       ▼
                    Result shown + saved to Firestore history
```

**Why OCR needs a review step:** OCR guesses letter shapes and can misread blurry or tilted photos. Letting the user fix mistakes before conversion keeps the final output trustworthy.

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Backend | Python 3.11 + FastAPI | API server |
| Transliteration | Aksharamukha | Kannada → Devanagari conversion |
| PDF parsing | PyMuPDF | Text extraction from digital PDFs |
| OCR | Tesseract (`kan` language pack) | Reading text from images |
| Image preprocessing | OpenCV | Grayscale, contrast, deskew, binarize |
| DOCX export | python-docx | Download results as Word |
| Frontend | React + Vite + Tailwind CSS | User interface |
| Auth and history | Firebase Auth + Firestore | Login and cross-device history |
| Fonts | Noto Sans Kannada, Noto Sans Devanagari | Correct script rendering |
| Frontend hosting | Firebase Hosting | Free, HTTPS |
| Backend hosting | Render (free tier) | Runs Python and Tesseract |

---

## Project Structure

```
translator/
├── backend/
│   ├── main.py                     # FastAPI app, CORS, rate limiting
│   ├── requirements.txt
│   ├── override_dictionary.json    # Custom word mappings
│   ├── Dockerfile                  # Bundles Tesseract + Kannada data
│   ├── services/
│   │   ├── transliterator.py       # NFC + overrides + Aksharamukha
│   │   ├── pdf_processor.py        # PyMuPDF + OCR fallback
│   │   ├── image_processor.py      # OpenCV + Tesseract
│   │   └── docx_exporter.py        # .docx generation
│   ├── routers/
│   │   ├── transliterate.py        # /api/transliterate/*
│   │   └── overrides.py            # /api/overrides
│   └── tests/
│       └── test_transliterator.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html                  # Loads Noto fonts
    ├── firebase.json
    ├── firestore.rules
    └── src/
        ├── firebaseConfig.js
        ├── App.jsx
        ├── index.css
        └── components/
            ├── Header.jsx
            ├── TabNavigation.jsx
            ├── TextTransliteration.jsx
            ├── PdfTransliteration.jsx
            ├── ImageTransliteration.jsx
            ├── HistorySidebar.jsx
            ├── OverrideManager.jsx
            └── Common/
                ├── StatCounter.jsx
                ├── ActionToolbar.jsx
                └── LoadingSpinner.jsx
```

---

## Prerequisites

- **Python 3.11** (recommended). Aksharamukha has failed with `ImportError: cannot import name 'Str' from 'ast'` on Python 3.14, because `ast.Str` was removed in newer Python versions. Use 3.11 for the safest setup
- **Node.js 18+**
- **Tesseract OCR** with the Kannada language pack (`kan.traineddata`)
- A **Firebase** project (free)
- Git

### Install Tesseract

**Windows**
```
winget install UB-Mannheim.TesseractOCR
```
Then download `kan.traineddata` from the official tessdata repository and place it in the `tessdata` folder inside the Tesseract install directory (usually `C:\Program Files\Tesseract-OCR\tessdata`).

**Ubuntu / Debian**
```
sudo apt-get install tesseract-ocr tesseract-ocr-kan
```

**macOS**
```
brew install tesseract tesseract-lang
```

Check it worked:
```
tesseract --list-langs
```
`kan` must appear in the list.

---

## Backend Setup

```
cd backend

# Create a virtual environment with Python 3.11
py -3.11 -m venv .venv          # Windows
python3.11 -m venv .venv        # macOS / Linux

# Activate it
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

**`requirements.txt` (pin exact versions once everything works):**
```
fastapi
uvicorn
python-multipart
aksharamukha
pymupdf
pytesseract
opencv-python-headless
pillow
python-docx
slowapi
pydantic
```

Add a `.python-version` file containing `3.11` so every machine uses the same interpreter.

---

## Frontend Setup

```
cd frontend
npm install
```

In `index.html`, load the fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada&family=Noto+Sans+Devanagari&display=swap" rel="stylesheet">
```

Always load these web fonts. Relying on system fonts makes conjuncts render wrongly on some phones.

---

## Firebase Setup (Login + History)

1. Go to the Firebase Console and create a project
2. **Authentication:** enable **Google** sign-in (and **Anonymous** if you want guest use)
3. **Firestore Database:** create a database
4. **Hosting:** enable it (used at deploy time)
5. Register a web app in Project Settings and copy its config values into your `.env`
6. Add these **security rules** before going live:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/history/{historyId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**History document structure:**
```
users/{uid}/history/{historyId}
  inputType: "text" | "pdf" | "image"
  originalText: string
  transliteratedText: string
  fileName: string (optional)
  timestamp: serverTimestamp
```

Keep only the latest 50 entries per user to stay inside the free quota.

---

## Environment Variables

**`frontend/.env`**
```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**`backend/.env`**
```
ALLOWED_ORIGINS=http://localhost:5173,https://your-app.web.app
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
MAX_UPLOAD_MB=8
MAX_PDF_PAGES=20
MAX_CONCURRENT_OCR_JOBS=3
RATE_LIMIT=10/minute
```

`TESSERACT_CMD` is only needed if Tesseract is not on your PATH (common on Windows).

Never commit `.env` files. Add this to `.gitignore`:
```
.venv/
__pycache__/
node_modules/
.env
dist/
```

---

## Running Locally

**Terminal 1: backend**
```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
API docs open at http://localhost:8000/docs

**Terminal 2: frontend**
```
cd frontend
npm run dev
```
App opens at http://localhost:5173

**Windows console tip:** if printing Kannada or Devanagari crashes with `UnicodeEncodeError: 'charmap' codec`, run `set PYTHONIOENCODING=utf-8` first, or add this at the top of your script:
```python
import sys
sys.stdout.reconfigure(encoding='utf-8')
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transliterate/text` | Body `{ "text": "..." }`. Returns `{ "result": "...", "stats": {...} }` |
| POST | `/api/transliterate/pdf` | Upload a PDF. Returns a list of `{ page, original, transliterated }` |
| POST | `/api/transliterate/pdf/export-docx` | Returns a .docx of the results |
| POST | `/api/transliterate/image` | Upload an image. Returns `{ extractedText }` for review |
| GET | `/api/status/{job_id}` | Poll a background job (large PDFs and OCR) |
| GET | `/api/overrides` | List override entries |
| POST | `/api/overrides` | Add or update an entry |
| DELETE | `/api/overrides/{word}` | Remove an entry |

The image endpoint **does not** transliterate. After the user reviews and edits the OCR text, the frontend sends it to `/api/transliterate/text`.

---

## Override Dictionary

`backend/override_dictionary.json` forces specific spellings. Matching uses **longest match first**, so multi-word entries are not partly overwritten by single-word ones.

```json
{
  "ಬೆಂಗಳೂರು": "बेंगलुरु",
  "ಮೈಸೂರು": "मैसूर"
}
```

Raw Aksharamukha output is phonetically correct but not always the commonly used spelling, so use this file for names and places. Add entries whenever real users report an awkward result.

---

## Testing

Run the backend tests:
```
cd backend
python tests/test_transliterator.py
```

**Sample pairs (verified with real Aksharamukha output):**

| Kannada | Devanagari |
|---|---|
| ನಮಸ್ಕಾರ | नमस्कार |
| ಧನ್ಯವಾದ | धन्यवाद |
| ಕನ್ನಡ | कन्नड |
| ಭಾರತ | भारत |
| ಕರ್ನಾಟಕ | कर्नाटक |
| ನೀರು | नीरु |

**Sentence:**
`ನನ್ನ ಹೆಸರು ರಾಜ್. ನಾನು ಕರ್ನಾಟಕದಿಂದ ಬಂದಿದ್ದೇನೆ.` → `नन्न हॆसरु राज्। नानु कर्नाटकदिंद बंदिद्देनॆ।`

**Testing tips:**
- Use assertions for pass/fail, and write eyeball output to a UTF-8 file rather than printing to the console
- Take expected values from the real engine, not from hand-written guesses
- Keep a fixed set of 10 to 15 pairs as a regression suite
- Test with: clean text, digital PDF, scanned PDF, sharp image, tilted blurry phone photo
- Test on a real Android phone and a real iPhone, not only desktop emulation
- Load test with Locust (10 simultaneous uploads) before sharing widely

---

## Deployment (Free Tier)

### Backend on Render

Tesseract is a system program, so deploy with Docker.

**`backend/Dockerfile`**
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr tesseract-ocr-kan \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
```

1. Push the repo to GitHub
2. On Render, create a new **Web Service** from the repo (Docker runtime, free plan)
3. Add the backend environment variables
4. Copy the service URL into the frontend's `VITE_API_URL`

### Frontend on Firebase Hosting

```
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory: dist, single-page app: yes
npm run build
firebase deploy
```

### Why two hosts

Firebase, Netlify and Vercel host the **frontend** only. They cannot run Python or install Tesseract. Render runs the backend "kitchen"; Firebase serves the "dining room".

### After deploying

- Confirm HTTPS works (phone camera capture requires it)
- Add your deployed frontend URL to `ALLOWED_ORIGINS` (CORS)
- Add the deployed domain to Firebase Auth's authorized domains

---

## Free-Tier Limits and Safeguards

Tesseract and Aksharamukha cost nothing per use, so there is no per-image fee. The real limit is the **free server**, which has little RAM and CPU. OCR is memory heavy, and many people uploading images at the same moment can crash it. The free instance also sleeps after idle time, so the first request can take 30 to 60 seconds.

Free hosting terms change, so check Render's current free plan limits before relying on specific numbers.

**Safeguards built into the app (all free):**

| Safeguard | Why |
|---|---|
| File size cap (about 8 MB) | Stops huge uploads exhausting memory |
| PDF page cap (about 20) | Keeps jobs short |
| Image downscale (about 1600 px wide) before OCR | Saves RAM and CPU with no accuracy loss |
| Concurrency limit (about 3 OCR jobs) | Prevents memory exhaustion |
| Job queue + status polling | No long blocking requests; the browser never hangs |
| Rate limiting (`slowapi`, about 10 requests/min) | Stops one user flooding the server |
| Result caching (hash of the input) | Skips repeat work |
| Delete uploads right after processing | Privacy, and no disk build-up |

**Realistic expectation:** fine for personal use and a handful of people. Heavy simultaneous OCR from many users may still strain a free instance.

---

## Known Issues

1. **Punctuation inside emails and URLs.** The raw engine converts `.` to the Devanagari danda `।`, so `raj@example.com` becomes `raj@example।com`. Detect emails and URLs before conversion and skip punctuation conversion inside them
2. **Bengaluru / Mysuru spelling.** Raw output (`बॆंगळूरु`, `मैसूरु`) differs from common spellings. Fix with the override dictionary
3. **Short vowels.** Kannada short `e` and `o` can come out with Devanagari candra-style marks (for example `मनॆ`). This is phonetically precise; post-process if you prefer plain `े`
4. **OCR and Latin text.** With `-l kan` only, English words are garbled. Consider `-l kan+eng` for mixed documents
5. **OCR small errors.** Missing marks and merged or split words happen on blurry photos. This is why the review step exists
6. **Python 3.14.** Aksharamukha import failures; use Python 3.11

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ImportError: cannot import name 'Str' from 'ast'` | Recreate the venv with Python 3.11. Do not patch library files |
| `UnicodeEncodeError: 'charmap' codec` | Set `PYTHONIOENCODING=utf-8` or reconfigure stdout to UTF-8 |
| `TesseractNotFoundError` | Install Tesseract and set `TESSERACT_CMD` |
| OCR returns empty text | Check `tesseract --list-langs` includes `kan` |
| Kannada shows as empty boxes | Missing font. Load Noto Sans Kannada / Devanagari |
| CORS error in browser | Add the frontend URL to `ALLOWED_ORIGINS` |
| Camera capture does nothing | Needs HTTPS; test on a deployed URL or use a tunnel |
| First request very slow on Render | Free instance waking from sleep; wait about a minute |
| Firestore permission denied | Check security rules and that the user is signed in |

---

## Roadmap

- [ ] Background job queue with progress bar for large PDFs
- [ ] URL/email protection in the post-processor
- [ ] `kan+eng` OCR mode toggle
- [ ] "Report incorrect transliteration" feedback button
- [ ] Batch upload
- [ ] Privacy policy and terms pages
- [ ] Optional OCR upgrade (Google Cloud Vision) if Tesseract accuracy is not enough

---

## Credits

- [Aksharamukha](https://github.com/virtualvinodh/aksharamukha): script conversion engine
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract): text recognition
- [PyMuPDF](https://pymupdf.readthedocs.io/): PDF parsing
- [OpenCV](https://opencv.org/): image preprocessing
- [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Firebase](https://firebase.google.com/)
- Noto Sans fonts by Google

## License

Choose a license for your project (MIT is a common default). Note that each dependency has its own license; check them before commercial use.
