/**
 * API service for communicating with the FastAPI backend.
 * The backend URL is the only configuration needed here.
 * NO API keys are stored or used in the frontend.
 */

const API_BASE_URL = "http://localhost:8000";

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface Education {
  degree?: string;
  institution?: string;
  year?: string;
  score?: string;
}

export interface Project {
  name: string;
  technologies: string[];
  description: string;
}

export interface Experience {
  role?: string;
  company?: string;
  duration?: string;
  description?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface ScoreBreakdown {
  skills: number;
  projects: number;
  education: number;
  experience: number;
  formatting: number;
  keywords: number;
}

export interface ResumeScore {
  overall: number;
  breakdown: ScoreBreakdown;
  score_note: string;
}

export interface ResumeAnalysis {
  summary: string;
  skills: SkillGroup[] | string[];
  education: Education[];
  projects: Project[];
  experience: Experience[];
  certifications: Certification[];
  strengths: string[];
  areas_to_improve: string[];
  potential_skill_gaps: string[];
  resume_suggestions: string[];
  score?: ResumeScore;
}

export interface JobMatch {
  matching_skills: string[];
  potential_gaps: string[];
  relevant_experience: string[];
  alignment_suggestions: string[];
}

export interface AnalysisResult {
  success: boolean;
  analysis?: ResumeAnalysis;
  job_match?: JobMatch;
  job_match_error?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
}

export interface VerifyResult {
  success: boolean;
  provider?: string;
  model?: string;
  error?: string;
  error_type?: string;
}

/**
 * Check backend health.
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Verify Gemini API connectivity (actually contacts Gemini).
 */
export async function verifyGemini(): Promise<VerifyResult> {
  const response = await fetch(`${API_BASE_URL}/api/ai/verify`, {
    method: "POST",
  });
  const data = await response.json();
  return data;
}

/**
 * Upload and analyze a resume PDF.
 * Optionally includes a job description for matching.
 *
 * @param resumeFile - PDF file to analyze
 * @param jobDescription - Optional job description text
 */
export async function analyzeResume(
  resumeFile: File,
  jobDescription?: string
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  if (jobDescription && jobDescription.trim()) {
    formData.append("job_description", jobDescription.trim());
  }

  const response = await fetch(`${API_BASE_URL}/api/analyze-resume`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    // Backend returned an error — use its detail message
    const errorMessage =
      data?.detail ||
      data?.error ||
      `Server error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
}
