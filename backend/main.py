"""
FastAPI backend for the AI Resume Analyzer.
Provides endpoints for health check, Gemini verification, and resume analysis.
"""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ai_service import GeminiError, analyze_resume, ocr_resume_images, verify_gemini_connection
from pdf_service import PDFExtractionError, extract_text_from_pdf

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


# ──────────────────────────────────────────────────────────────
# App Setup
# ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    model = os.environ.get("GEMINI_MODEL", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. Resume analysis will fail until configured.")
    else:
        # Log only a masked version — never the full key
        masked = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "***"
        logger.info(f"Gemini API key loaded (masked): {masked}")
    if model:
        logger.info(f"Gemini model configured: {model}")
    else:
        logger.warning("GEMINI_MODEL is not set.")
    yield


app = FastAPI(
    title="AI Resume Analyzer API",
    description="LLM-powered resume analysis using Google Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.post("/api/ai/verify")
async def verify_ai():
    """
    Verify Gemini API connectivity by sending a minimal test prompt.
    Actually contacts Gemini — not a mock.
    """
    result = await verify_gemini_connection()
    status_code = 200 if result.get("success") else 503
    return JSONResponse(content=result, status_code=status_code)


@app.post("/api/analyze-resume")
async def analyze_resume_endpoint(
    resume: UploadFile = File(..., description="PDF resume file"),
    job_description: str = Form(default="", description="Optional job description text"),
):
    """
    Analyze a resume PDF using Google Gemini.

    - Extracts text from the uploaded PDF.
    - Sends text to Gemini for structured analysis.
    - Optionally compares against a job description.
    """
    # ── Validate file type ───────────────────────────────────
    if not resume.filename:
        raise HTTPException(status_code=400, detail="No file was provided.")

    filename_lower = resume.filename.lower()
    if not filename_lower.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported. Please upload a .pdf resume."
        )

    content_type = resume.content_type or ""
    if content_type and content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are supported."
        )

    # ── Read file bytes ──────────────────────────────────────
    file_bytes = await resume.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed size is 10 MB."
        )

    # ── Step 1: Native PDF text extraction ──────────────────
    logger.info(f"Processing resume: {resume.filename} ({len(file_bytes):,} bytes)")
    try:
        resume_text, page_images = extract_text_from_pdf(file_bytes)
    except PDFExtractionError as e:
        logger.warning(f"PDF open/parse failed for '{resume.filename}': {e}")
        raise HTTPException(status_code=422, detail=str(e))

    ocr_used = False

    if resume_text:
        # Native extraction succeeded
        logger.info(
            f"Native extraction: {len(resume_text):,} characters "
            f"from '{resume.filename}' | OCR: not needed"
        )
    else:
        # ── Step 2: Gemini Vision OCR fallback ──────────────
        logger.info(
            f"Native extraction insufficient for '{resume.filename}' "
            f"({len(page_images)} page image(s)) — running Gemini Vision OCR"
        )
        try:
            resume_text = await ocr_resume_images(page_images)
            ocr_used = True
            logger.info(
                f"OCR complete: {len(resume_text):,} characters extracted | "
                f"OCR: required"
            )
        except GeminiError as e:
            logger.error(f"OCR failed [{e.error_type}] for '{resume.filename}': {e}")
            status_map = {
                "configuration": 503,
                "authentication": 401,
                "permission": 403,
                "model_not_found": 404,
                "rate_limit": 429,
                "service_unavailable": 503,
                "timeout": 504,
                "ocr_failed": 422,
            }
            status_code = status_map.get(e.error_type, 500)
            raise HTTPException(status_code=status_code, detail=str(e))

    # ── Step 3: Gemini resume analysis ──────────────────────
    logger.info(
        f"Sending resume to Gemini for analysis "
        f"| file='{resume.filename}' | chars={len(resume_text):,} | ocr={ocr_used}"
    )
    try:
        jd = job_description.strip() if job_description else None
        result = await analyze_resume(resume_text, job_description=jd)
    except GeminiError as e:
        logger.error(f"Gemini analysis failed [{e.error_type}]: {e}")
        status_map = {
            "configuration": 503,
            "authentication": 401,
            "permission": 403,
            "model_not_found": 404,
            "rate_limit": 429,
            "service_unavailable": 503,
            "timeout": 504,
            "server_error": 502,
            "malformed_response": 422,
            "empty_response": 422,
        }
        status_code = status_map.get(e.error_type, 500)
        raise HTTPException(status_code=status_code, detail=str(e))

    logger.info(
        f"Analysis complete | file='{resume.filename}' | ocr={ocr_used} | "
        f"job_match={'yes' if result.get('job_match') else 'no'}"
    )

    return {
        "success": True,
        "analysis": result.get("analysis"),
        "job_match": result.get("job_match"),
        "job_match_error": result.get("job_match_error"),
    }
