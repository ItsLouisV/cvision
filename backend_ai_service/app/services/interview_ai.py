from typing import List, Dict, Any
from app.core.gemini import gemini
from app.prompts.interview import INTERVIEW_PROMPT
import logging

logger = logging.getLogger(__name__)


class InterviewAIService:
    async def generate_question(self,
                                job_title: str,
                                requirements: str,
                                history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Tạo câu hỏi phỏng vấn tiếp theo"""

        # Format history
        history_text = ""
        for msg in history[-5:]:  # Chỉ lấy 5 tin nhắn gần nhất
            sender = "AI" if msg['sender'] == 'ai' else "Ứng viên"
            history_text += f"{sender}: {msg['content']}\n"

        prompt = INTERVIEW_PROMPT.format(
            job_title=job_title,
            requirements=requirements,
            context="Đang phỏng vấn thực tế",
            history=history_text
        )

        try:
            response = await gemini.generate_json(prompt)
            return response
        except Exception as e:
            logger.error(f"Interview question generation error: {e}")
            return {
                "type": "question",
                "content": "Hãy giới thiệu về bản thân và kinh nghiệm của bạn?",
                "question_number": len(history) // 2 + 1
            }

    async def evaluate_interview(self,
                                 job_title: str,
                                 messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Đánh giá toàn bộ buổi phỏng vấn"""

        # Tạo prompt đánh giá
        interview_text = ""
        for msg in messages:
            role = "Interviewer" if msg['sender'] == 'ai' else "Candidate"
            interview_text += f"{role}: {msg['content']}\n"

        prompt = f"""
        Đánh giá buổi phỏng vấn cho vị trí {job_title}:

        {interview_text}

        Hãy đánh giá:
        1. Điểm kỹ thuật (0-100)
        2. Điểm giao tiếp (0-100)  
        3. Điểm thái độ (0-100)
        4. 3 điểm mạnh
        5. 3 điểm cần cải thiện
        6. Lời khuyên phát triển

        Trả về JSON.
        """

        try:
            return await gemini.generate_json(prompt)
        except Exception as e:
            logger.error(f"Interview evaluation error: {e}")
            return {
                "overall_score": 0,
                "technical_score": 0,
                "communication_score": 0,
                "strengths": [],
                "weaknesses": [],
                "advice": "Không thể đánh giá tự động"
            }


interview_ai = InterviewAIService()