<<<<<<< HEAD
# Resume_anz
=======
# AI Resume Analyzer

> **LLM-Powered Resume Analysis and Job Matching System**  
> Built with Google Gemini, FastAPI, React + Vite, and Tailwind CSS  
> *Internship Project — Generative AI with LLMs*

---

## Project Description

AI Resume Analyzer is a full-stack web application that uses **Google Gemini** (a Large Language Model) to analyze resume PDFs and generate structured, human-readable insights. The system extracts text from uploaded PDFs and sends it to Gemini for real AI-powered analysis — there is no rule-based or keyword-matching fake AI involved.

---

## Why Generative AI / Why an LLM?

Traditional resume parsers use rigid pattern matching, regular expressions, and keyword lookup — they fail on unusual formats, miss context, and can't generate natural language insights.

This project uses Google Gemini because:

- **LLMs understand context** — Gemini reads a resume the same way a human recruiter would, understanding meaning not just keywords.
- **LLMs generate natural language** — Skills, summaries, strengths, and suggestions are articulated in clear, useful prose.
- **LLMs handle varied formats** — Resume styles differ wildly; Gemini handles free-form text.
- **Generative AI is appropriate** — The core output (analysis, suggestions) is *generated* by the model, not retrieved from a database.

---

## How the LLM is Used

```
User uploads PDF
    ↓
PyMuPDF extracts text from all pages
    ↓
FastAPI backend sends text to Google Gemini with a structured system prompt
    ↓
Gemini generates a structured JSON analysis
    ↓
Backend validates and parses the JSON
    ↓
React frontend displays the structured insights
```

If a job description is also provided:
```
Both resume text + job description → Gemini → Matching analysis JSON → React UI
```

**Anti-hallucination system prompt** instructs Gemini to only analyze what is explicitly present in the resume — it must not invent skills, companies, or achievements.

---

## Features

- 📄 **PDF Upload** — Drag & drop or browse; validates file type and size
- 🤖 **Gemini Analysis** — Real LLM-powered resume analysis
- 📊 **Structured Results** — Summary, Skills, Education, Projects, Experience, Certifications, Strengths, Areas to Improve, Skill Gaps, Resume Suggestions
- 🎯 **Job Description Matching** — Optional; factual comparison (no fake ATS score)
- ⚠️ **Full Error Handling** — Invalid PDFs, missing API key, Gemini errors all handled gracefully
- 🔒 **Secure** — API key stays on the backend; never exposed to the browser

---

## Architecture

```
Frontend (React + Vite + Tailwind CSS)
    │   POST /api/analyze-resume (multipart form)
    ▼
Backend (FastAPI, Python)
    ├── pdf_service.py   →  PyMuPDF text extraction
    ├── ai_service.py    →  Google Gemini API call
    └── main.py          →  FastAPI routes + validation
    │   google-genai SDK
    ▼
Google Gemini LLM
    │   Structured JSON response
    ▼
React UI renders analysis cards
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS v4 |
| Backend | Python 3, FastAPI, Uvicorn |
| PDF Extraction | PyMuPDF (fitz) |
| LLM | Google Gemini (via `google-genai` SDK) |
| Icons | Lucide React |

---

## Folder Structure

```
resume-analyzer/
│
├── backend/
│   ├── main.py           # FastAPI app, routes
│   ├── ai_service.py     # Google Gemini integration
│   ├── pdf_service.py    # PDF text extraction
│   ├── schemas.py        # Pydantic models
│   ├── requirements.txt  # Python dependencies
│   ├── .env              # API keys (never committed)
│   └── .env.example      # Template (safe to commit)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx   # Upload UI
│   │   │   └── ResultsPage.tsx  # Analysis results UI
│   │   ├── services/
│   │   │   └── api.ts           # Backend API calls
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## Installation

### Prerequisites

- Python 3.9+
- Node.js 18+ (20+ recommended)
- A Google Gemini API key — get one at [aistudio.google.com](https://aistudio.google.com)

---

### 1. Clone / navigate to the project

```bash
cd "resume anz"
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

---

## Gemini API Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

> ⚠️ **Never commit `.env` to Git.** It is listed in `.gitignore`.  
> Get your API key at https://aistudio.google.com/app/apikey

**Supported models:**
- `gemini-1.5-flash` — Fast, recommended for this project
- `gemini-1.5-pro` — More capable, slower
- `gemini-2.0-flash` — Latest fast model (if available on your key)

---

## Backend Startup

```bash
cd backend
source venv/bin/activate   # if using venv
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**

API docs: http://localhost:8000/docs

---

## Frontend Startup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Example Workflow

1. Start the backend server.
2. Start the frontend dev server.
3. Open http://localhost:5173 in your browser.
4. Drag and drop a PDF resume onto the upload area.
5. (Optional) Paste a job description.
6. Click **Analyze Resume**.
7. Wait 10–30 seconds while Gemini analyzes the resume.
8. View structured results — Summary, Skills, Education, Projects, etc.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/ai/verify` | Verify Gemini API connectivity |
| POST | `/api/analyze-resume` | Analyze a PDF resume |

---

## Limitations (Version 1)

- Image-only/scanned PDFs cannot be analyzed (no OCR).
- No authentication or user accounts.
- No persistent storage of resumes or results.
- Analysis quality depends on Gemini API availability and quota.
- Gemini may occasionally return slightly different JSON structures; the backend handles this gracefully.

---

## Future Enhancements

- OCR support for scanned PDFs
- Resume version history
- Export results as PDF
- Multiple resume comparison
- Role-specific analysis templates
- Support for DOCX format

---

## Security Notes

- The Gemini API key **only** exists in `backend/.env`.
- It is **never** sent to the frontend.
- It is **never** logged in full.
- `.env` is in `.gitignore` and will not be committed to version control.

---

*Built for the "Generative AI with LLMs" internship project.*
>>>>>>> 19870bf (Commited)
