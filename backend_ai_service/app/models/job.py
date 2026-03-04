from pydantic import BaseModel
from typing import List, Optional

class JobMatchRequest(BaseModel):
    cv_id: str
    job_id: str

class JobMatchResponse(BaseModel):
    job_id: str
    match_score: int
    reason: str
    missing_skills: List[str]
    is_qualified: bool