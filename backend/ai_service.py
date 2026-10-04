"""
AI service for resume analysis using Google Gemini.
Uses the official google-genai SDK (from google import genai).
"""
import asyncio
import json
import os
import logging
import re
from typing import List, Optional, Tuple, Dict, Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Prompts
# ──────────────────────────────────────────────────────────────

RESUME_SYSTEM_INSTRUCTION = """You are a professional resume analyst AI assistant.

Your task is to analyze the provided resume text and return a structured JSON analysis.

CRITICAL RULES - ANTI-HALLUCINATION:
1. You must ONLY analyze information that is explicitly present in the resume text.
2. Do NOT invent skills, companies, experience, internships, education, certifications, projects, achievements, numerical results, technologies, or job titles.
3. If information is not present in the resume, state "Not mentioned in the resume." for that field or return an empty list.
4. Do NOT guess the candidate's target role.
5. Do NOT add generic compliments like "Excellent candidate" or "Perfect resume."
6. Every strength you mention must be traceable to specific content in the resume.
7. For "potential_skill_gaps", do NOT claim missing skills are definitely required. Use language like "Consider learning X for [domain] roles."

Return ONLY a valid JSON object - no markdown, no code fences, no explanation text.

The JSON must follow this exact schema:
{
  "summary": "A concise 2-3 sentence summary of the candidate based ONLY on resume content.",
  "skills": [
    {
      "category": "Category Name",
      "skills": ["skill1", "skill2"]
    }
  ],
  "education": [
    {
      "degree": "Degree name or Not mentioned",
      "institution": "Institution name or Not mentioned",
      "year": "Year or Not mentioned",
      "score": "CGPA/percentage or Not mentioned"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "technologies": ["tech1", "tech2"],
      "description": "Description based only on resume content"
    }
  ],
  "experience": [
    {
      "role": "Job title",
      "company": "Company name",
      "duration": "Duration",
      "description": "Description"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuer or Not mentioned",
      "year": "Year or Not mentioned"
    }
  ],
  "strengths": ["strength1 with evidence from resume", "strength2"],
  "areas_to_improve": ["specific actionable suggestion1", "suggestion2"],
  "potential_skill_gaps": ["Consider learning X for Y-type roles", "..."],
  "resume_suggestions": ["Specific formatting or content suggestion1", "suggestion2"],
  "score": {
    "overall": 72,
    "breakdown": {
      "skills": 15,
      "projects": 14,
      "education": 12,
      "experience": 10,
      "formatting": 11,
      "keywords": 10
    },
    "score_note": "This score is an AI estimate based solely on resume content. It does not guarantee job selection."
  }
}

SCORING RULES - be honest and evidence-based. Score strictly on what is present in the resume:
- skills (0-20 pts): Variety, depth, relevance of explicitly listed skills.
  0-5: very few or vague skills. 6-12: moderate skills. 13-20: diverse, clearly listed technical skills.
- projects (0-20 pts): Number of projects, technical depth, description quality.
  0-5: no projects or only named without detail. 6-12: some projects with partial detail. 13-20: multiple well-described technical projects.
- education (0-15 pts): Degree level, institution, CGPA/score if present.
  0-5: education not mentioned or very vague. 6-10: degree and institution present. 11-15: degree + institution + CGPA/year all present.
- experience (0-20 pts): Internships, jobs, roles explicitly mentioned.
  0-5: no experience mentioned. 6-12: one internship or role with basic detail. 13-20: multiple roles or strong descriptions.
- formatting (0-15 pts): Infer from text structure - clear section headers, organised layout, dates, bullet-style content.
  0-5: disorganised or missing sections. 6-10: partially organised. 11-15: well-structured clear sections.
- keywords (0-10 pts): Industry-relevant technical terms, tools, technologies present.
  0-3: very few keywords. 4-7: moderate relevant keywords. 8-10: rich in domain-specific terms.
- overall: rounded integer sum of all six category scores (max 100).
- breakdown values are the raw category scores (e.g. skills: 15 means 15 out of 20).
- If a section is completely absent, score it 0-3. Do NOT assign mid or high scores for absent content.
- score_note must always say: "This score is an AI estimate based solely on resume content. It does not guarantee job selection."

If no experience is found, set "experience" to [{"role": "No professional experience mentioned.", "company": "", "duration": "", "description": ""}].
If no certifications are found, set "certifications" to [].
Group skills by category (e.g., Programming Languages, Frameworks, Tools, AI/ML, Databases, Web Technologies).
"""

JOB_MATCH_SYSTEM_INSTRUCTION = """You are a professional resume-to-job-description matching analyst.

Your task is to compare a resume and a job description and return a structured JSON analysis.

CRITICAL RULES:
1. Base ALL analysis strictly on the provided resume text and job description text.
2. Do NOT invent skills, experience, or qualifications not present in the resume.
3. Do NOT generate or claim an ATS score or percentage match.
4. Be factual and specific.

Return ONLY a valid JSON object - no markdown, no code fences, no explanation text.

Schema:
{
  "matching_skills": ["skill mentioned in both resume and JD"],
  "potential_gaps": ["skill/requirement in JD not found in resume"],
  "relevant_experience": ["resume content that is relevant to the JD"],
  "alignment_suggestions": ["actionable suggestion to better align resume with this JD"]
}
"""

OCR_SYSTEM_INSTRUCTION = """You are a precise OCR assistant.

Your task is to extract ALL readable text from the provided image(s) of a resume page.

RULES:
1. Transcribe every piece of text visible on the page exactly as it appears.
2. Preserve logical grouping - keep name, contact info, section headers, bullet points, dates together.
3. Do NOT interpret, summarise, or analyse the content.
4. Do NOT add any commentary, headings, or labels of your own.
5. Output only the raw extracted text - nothing else.
6. If a page is blank or completely unreadable, output: [PAGE UNREADABLE]
"""


class GeminiError(Exception):
    """Custom exception for Gemini API errors."""
    def __init__(self, message: str, error_type: str = "unknown"):
        super().__init__(message)
        self.error_type = error_type


def _get_client() -> Tuple[genai.Client, str]:
    """
    Create and return a configured Gemini client and model name.

    Returns:
        Tuple of (client, model_name)

    Raises:
        GeminiError: If API key or model is not configured.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiError(
            "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend .env file.",
            error_type="configuration"
        )

    model_name = os.environ.get("GEMINI_MODEL", "").strip()
    if not model_name:
        raise GeminiError(
            "Gemini model is not configured. Please set GEMINI_MODEL in the backend .env file.",
            error_type="configuration"
        )

    client = genai.Client(api_key=api_key)
    return client, model_name


def _safe_response_text(response: Any) -> str:
    """
    Safely extract text from a Gemini response.
    Returns empty string instead of raising if response.text is None
    (which happens on safety blocks or empty candidate responses).
    """
    try:
        text = response.text
        return text.strip() if text else ""
    except (AttributeError, ValueError):
        return ""


async def _generate_with_retry(
    client: genai.Client,
    model_name: str,
    contents: Any,
    config: types.GenerateContentConfig,
    max_retries: int = 3,
    base_delay: float = 3.0,
) -> Any:
    """
    Call client.models.generate_content with automatic retry on transient 503 errors.

    Raises:
        Last exception if all retries exhausted.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            return response
        except Exception as exc:
            last_exc = exc
            err = str(exc).lower()
            is_transient = (
                "503" in err
                or "unavailable" in err
                or "overloaded" in err
                or "high demand" in err
                or "temporarily" in err
            )
            if is_transient and attempt < max_retries:
                delay = base_delay * attempt  # 3s, 6s, 9s
                logger.warning(
                    f"Gemini 503 on attempt {attempt}/{max_retries} — "
                    f"retrying in {delay:.0f}s"
                )
                await asyncio.sleep(delay)
                continue
            raise
    raise last_exc  # type: ignore


def _classify_api_error(error: Exception) -> Tuple[str, str]:
    """
    Classify a Gemini API error into a user-friendly message and error type.

    Returns:
        Tuple of (user_message, error_type)
    """
    error_str = str(error).lower()

    if "api_key" in error_str or "api key" in error_str or "401" in error_str or "unauthenticated" in error_str:
        return (
            "Invalid or missing Gemini API key. Please check your GEMINI_API_KEY configuration.",
            "authentication"
        )
    elif "403" in error_str or "permission" in error_str or "forbidden" in error_str:
        return (
            "Access denied by Gemini API. Your API key may not have permission to use this model.",
            "permission"
        )
    elif "404" in error_str or "not found" in error_str or "model" in error_str and "not" in error_str:
        return (
            "The configured Gemini model was not found. Please check your GEMINI_MODEL configuration.",
            "model_not_found"
        )
    elif "429" in error_str or "quota" in error_str or "rate" in error_str or "exhausted" in error_str:
        return (
            "Gemini API quota exceeded or rate limit reached. Please try again later.",
            "rate_limit"
        )
    elif "503" in error_str or "unavailable" in error_str or "overloaded" in error_str:
        return (
            "Gemini service is temporarily unavailable. Please try again in a few minutes.",
            "service_unavailable"
        )
    elif "timeout" in error_str or "deadline" in error_str:
        return (
            "The request to Gemini timed out. Please try again.",
            "timeout"
        )
    elif "500" in error_str or "internal" in error_str:
        return (
            "Gemini encountered an internal server error. Please try again.",
            "server_error"
        )
    else:
        return (
            "An error occurred while communicating with Gemini. Please try again.",
            "unknown"
        )


def _extract_json_from_response(response_text: str) -> Dict[str, Any]:
    """
    Safely extract and parse JSON from Gemini's response text.

    Handles cases where Gemini wraps JSON in markdown code fences.

    Returns:
        Parsed JSON dictionary.

    Raises:
        GeminiError: If JSON cannot be extracted or parsed.
    """
    if not response_text or not response_text.strip():
        raise GeminiError(
            "Gemini returned an empty response. Please try again.",
            error_type="empty_response"
        )

    text = response_text.strip()

    # Remove markdown code fences if present
    # Match ```json ... ``` or ``` ... ```
    fence_pattern = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
    match = fence_pattern.search(text)
    if match:
        text = match.group(1).strip()

    # Try direct JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find a JSON object in the text
    # Look for the first { and the last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    raise GeminiError(
        "Gemini returned a response that could not be parsed as structured data. "
        "Please try analyzing the resume again.",
        error_type="malformed_response"
    )


async def ocr_resume_images(page_images: List[bytes]) -> str:
    """
    Use Gemini Vision to extract text from rendered PDF page images.

    Called when native PyMuPDF text extraction yields insufficient text
    (i.e., the PDF is scanned / image-based).

    Args:
        page_images: List of PNG bytes, one per PDF page.

    Returns:
        Concatenated extracted text from all pages.

    Raises:
        GeminiError: If Gemini is not configured or the call fails.
    """
    client, model_name = _get_client()

    all_page_texts: List[str] = []

    for page_num, img_bytes in enumerate(page_images, start=1):
        logger.info(f"OCR: sending page {page_num}/{len(page_images)} to Gemini Vision "
                    f"({len(img_bytes)} bytes)")

        # Build multimodal content: [image_part, text_instruction]
        image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/png")
        text_part = types.Part.from_text(
            text=(
                f"Extract all text from this resume page (page {page_num} of {len(page_images)}). "
                "Output only the raw text content."
            )
        )

        try:
            response = await _generate_with_retry(
                client, model_name,
                contents=[image_part, text_part],
                config=types.GenerateContentConfig(
                    system_instruction=OCR_SYSTEM_INSTRUCTION,
                    temperature=0.0,
                    max_output_tokens=4096,
                )
            )
        except Exception as exc:
            user_message, error_type = _classify_api_error(exc)
            logger.error(f"Gemini OCR failed on page {page_num}: {type(exc).__name__}")
            raise GeminiError(user_message, error_type=error_type)

        page_text = _safe_response_text(response)

        if page_text and page_text != "[PAGE UNREADABLE]":
            all_page_texts.append(page_text)
            logger.info(f"OCR page {page_num}: extracted {len(page_text)} characters")
        else:
            logger.warning(f"OCR page {page_num}: no readable text found")

    combined = "\n\n".join(all_page_texts).strip()

    if not combined:
        raise GeminiError(
            "Gemini Vision could not extract any readable text from this PDF. "
            "The resume may be too blurry, low-resolution, or entirely non-textual.",
            error_type="ocr_failed"
        )

    return combined


async def verify_gemini_connection() -> Dict[str, Any]:
    """
    Verify that Gemini API is reachable and the API key is valid.
    Uses a minimal test prompt.

    Returns:
        Dictionary with success status and provider/model info.
    """
    try:
        client, model_name = _get_client()
    except GeminiError as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": e.error_type
        }

    try:
        response = await _generate_with_retry(
            client, model_name,
            contents="Reply with exactly: OK",
            config=types.GenerateContentConfig(
                max_output_tokens=10,
                temperature=0.0,
            )
        )

        response_text = _safe_response_text(response)
        logger.info(f"Gemini verification response: {response_text[:20]}")

        return {
            "success": True,
            "provider": "Google Gemini",
            "model": model_name
        }

    except Exception as e:
        user_message, error_type = _classify_api_error(e)
        logger.error(f"Gemini verification failed: {type(e).__name__}")
        return {
            "success": False,
            "error": user_message,
            "error_type": error_type
        }


async def analyze_resume(
    resume_text: str,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze a resume using Google Gemini.

    Args:
        resume_text: Extracted text from the PDF resume.
        job_description: Optional job description for matching analysis.

    Returns:
        Dictionary containing structured analysis from Gemini.

    Raises:
        GeminiError: If the API call fails or response is malformed.
    """
    client, model_name = _get_client()

    # ── Resume Analysis ──────────────────────────────────────
    resume_prompt = f"""Analyze the following resume and return a structured JSON analysis.

RESUME TEXT:
{resume_text}

Remember: Analyze ONLY what is explicitly stated in the resume above. Return ONLY valid JSON."""

    try:
        resume_response = await _generate_with_retry(
            client, model_name,
            contents=resume_prompt,
            config=types.GenerateContentConfig(
                system_instruction=RESUME_SYSTEM_INSTRUCTION,
                temperature=0.1,
                max_output_tokens=4096,
            )
        )
    except Exception as e:
        user_message, error_type = _classify_api_error(e)
        logger.error(f"Gemini resume analysis failed: {type(e).__name__}")
        raise GeminiError(user_message, error_type=error_type)

    response_text = _safe_response_text(resume_response)
    analysis_data = _extract_json_from_response(response_text)

    result = {"analysis": analysis_data}

    # ── Job Description Matching (optional) ─────────────────
    if job_description and job_description.strip():
        jd_prompt = f"""Compare the following resume and job description. Return structured JSON analysis.

RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{job_description}

Remember: Be factual. Do NOT generate an ATS score. Return ONLY valid JSON."""

        try:
            jd_response = await _generate_with_retry(
                client, model_name,
                contents=jd_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=JOB_MATCH_SYSTEM_INSTRUCTION,
                    temperature=0.1,
                    max_output_tokens=2048,
                )
            )
        except Exception as e:
            # Job description matching failure is non-fatal
            user_message, error_type = _classify_api_error(e)
            logger.warning(f"Gemini JD matching failed: {type(e).__name__}")
            result["job_match_error"] = user_message
            return result

        jd_response_text = _safe_response_text(jd_response)
        try:
            jd_data = _extract_json_from_response(jd_response_text)
            result["job_match"] = jd_data
        except GeminiError as e:
            logger.warning(f"Job match JSON parse failed: {e}")
            result["job_match_error"] = str(e)

    return result
