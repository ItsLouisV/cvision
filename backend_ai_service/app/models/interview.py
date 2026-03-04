from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class ChatMessage(BaseModel):
    sender: str  # 'ai' hoặc 'user'
    content: str
    timestamp: datetime = datetime.now()

class InterviewSessionCreate(BaseModel):
    user_id: str
    job_id: Optional[str] = None
    session_type: str = "technical" # technical, behavioral, general

class InterviewFeedbackResponse(BaseModel):
    overall_score: int
    communication_score: int
    technical_score: int
    detailed_feedback: str
    suggested_answers: List[dict] # [{question, better_version}]