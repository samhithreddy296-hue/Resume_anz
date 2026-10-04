"""
PDF text extraction service using PyMuPDF.

Extraction flow:
  1. Try PyMuPDF native text extraction (fast, no API cost).
  2. If extracted text is insufficient (scanned/image PDF), render each
     page to a PNG image at 2× zoom and return those images so the caller
     can pass them to Gemini Vision OCR.
  3. Caller decides whether to proceed with text or request OCR.
"""
import re
from typing import List, Tuple

import fitz  # PyMuPDF


# Minimum number of characters to consider native extraction successful.
_MIN_TEXT_LENGTH = 20

# Resolution multiplier for page images sent to OCR.
# 2× gives ~150–200 DPI effective from a 72-DPI PDF unit, sufficient for Gemini Vision.
_OCR_ZOOM = 2.0


class PDFExtractionError(Exception):
    """Raised when a PDF cannot be opened or is structurally invalid."""
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, List[bytes]]:
    """
    Attempt native text extraction from a PDF.

    Returns:
        (text, page_images)
        - text: cleaned extracted text if native extraction succeeded (non-empty).
                Empty string "" if the PDF is image-based / scanned.
        - page_images: list of PNG bytes for each page.
                       Populated only when text == "" (OCR needed).
                       Empty list when native text was found.

    Raises:
        PDFExtractionError: PDF is corrupt, unreadable, or has zero pages.
    """
    doc = _open_pdf(file_bytes)

    if doc.page_count == 0:
        doc.close()
        raise PDFExtractionError("The uploaded PDF has no pages.")

    # ── Try native text extraction ────────────────────────────
    raw_parts: List[str] = []
    for i in range(doc.page_count):
        page = doc.load_page(i)
        t = page.get_text("text")
        if t:
            raw_parts.append(t)

    raw_text = "\n".join(raw_parts)
    cleaned = _clean_text(raw_text)

    if len(cleaned.strip()) >= _MIN_TEXT_LENGTH:
        doc.close()
        return cleaned, []          # Native extraction succeeded, no OCR needed

    # ── Native extraction insufficient → render pages for OCR ─
    page_images: List[bytes] = []
    matrix = fitz.Matrix(_OCR_ZOOM, _OCR_ZOOM)
    for i in range(doc.page_count):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=matrix)
        page_images.append(pix.tobytes("png"))

    doc.close()

    if not page_images:
        raise PDFExtractionError(
            "The PDF appears to have no renderable pages. "
            "Please upload a valid PDF resume."
        )

    return "", page_images           # Signal that OCR is required


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _open_pdf(file_bytes: bytes) -> fitz.Document:
    """Open PDF bytes, raising PDFExtractionError on failure."""
    try:
        return fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise PDFExtractionError(
            f"Unable to open PDF file. The file may be corrupt or not a valid PDF. "
            f"Detail: {exc}"
        )


def _clean_text(text: str) -> str:
    """
    Remove common PDF extraction artefacts without altering resume meaning.
    """
    if not text:
        return ""

    # Normalise line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Collapse more than 2 consecutive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip trailing whitespace per line
    lines = [line.rstrip() for line in text.split("\n")]

    # Drop purely decorative separator lines (---, ===, ..., ___)
    cleaned: List[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped and re.match(r"^[-_=.]{3,}$", stripped):
            continue          # drop decorator
        cleaned.append(line)

    text = "\n".join(cleaned)

    # Final blank-line collapse
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
