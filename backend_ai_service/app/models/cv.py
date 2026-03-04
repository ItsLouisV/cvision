from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class CVCreate(BaseModel):
    user_id: str
    file_url: str
    file_name: str

class CVAnalysisResponse(BaseModel):
    match_score: int
    summary: str
    skills_extracted: List[str]
    experience_summary: str
    education_history: List[dict] # [{school, degree, year}]
    strengths: List[str]
    weaknesses: List[str]
    improvements: List[str]

class CVEducation(BaseModel):
    school: str
    degree: str
    year: str