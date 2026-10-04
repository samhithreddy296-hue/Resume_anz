"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel
from typing import List, Optional, Any


class SkillGroup(BaseModel):
    category: str
    skills: List[str]


class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None
    score: Optional[str] = None


class Project(BaseModel):
    name: str
    technologies: List[str]
    description: str


class Experience(BaseModel):
    role: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None


class Certification(BaseModel):
    name: str
    issuer: Optional[str] = None
    year: Optional[str] = None


class ResumeAnalysis(BaseModel):
    summary: str
    skills: List[Any]
    education: List[Any]
    projects: List[Any]
    experience: List[Any]
    certifications: List[Any]
    strengths: List[str]
    areas_to_improve: List[str]
    potential_skill_gaps: List[str]
    resume_suggestions: List[str]


class JobMatchAnalysis(BaseModel):
    matching_skills: List[str]
    potential_gaps: List[str]
    relevant_experience: List[str]
    alignment_suggestions: List[str]


class AnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[ResumeAnalysis] = None
    job_match: Optional[JobMatchAnalysis] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str


class VerifyResponse(BaseModel):
    success: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    error: Optional[str] = None
    error_type: Optional[str] = None
