from typing import List, Dict, Any
from app.core.gemini import gemini
from app.prompts.interview import INTERVIEW_PROMPT
import logging


logger = logging.getLogger(__name__)


class InterviewAIService:
    async def generate_question(self,
                                job_title: str,
                                requirements: str,
                                cv_data: str,
                                language: str,
                                user_answers_count: int,
                                history: List[Dict[str, str]]) -> Dict[str, Any]:

        if language == "English":
            lang_instruction = "IMPORTANT: Conduct the entire interview in ENGLISH. All questions and feedback must be in English."
        elif language == "Bilingual":
            lang_instruction = (
                "IMPORTANT: This is a BILINGUAL interview. "
                "Primary technical questions should be in ENGLISH. "
                "You can provide explanations or follow-up clarifications in VIETNAMESE if needed. "
                "Encourage the candidate to use English but allow Vietnamese for complex technical concepts."
            )
        else:  # Mặc định Vietnamese
            lang_instruction = "QUAN TRỌNG: Thực hiện toàn bộ buổi phỏng vấn bằng TIẾNG VIỆT."

        """Tạo câu hỏi phỏng vấn tiếp theo"""

        # Format history
        history_text = ""
        for msg in history[-10:]:  # Chỉ lấy 10 tin nhắn gần nhất
            sender = "AI" if msg['sender'] == 'ai' else "Ứng viên"
            history_text += f"{sender}: {msg['content']}\n"

        prompt = INTERVIEW_PROMPT.format(
            job_title=job_title,
            requirements=requirements,
            cv_data=cv_data,
            user_answers_count=user_answers_count,
            history=history_text,
            language_instruction=lang_instruction
        )

        try:
            response = await gemini.generate_json(prompt)
            return response
        except Exception as e:
            logger.error(f"Interview question generation error: {e}")
            # Trả về câu hỏi tùy theo ngôn ngữ
            default_content = "Please introduce yourself and your experience?" if language == "English" else "Hãy giới thiệu về bản thân và kinh nghiệm của bạn?"
            return {
                "type": "question",
                "content": default_content,
                "question_number": len(history) // 2 + 1
            }

    async def evaluate_interview(self,
                                 job_title: str,
                                 language: str,
                                 messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Đánh giá toàn bộ buổi phỏng vấn"""

        # Tạo prompt đánh giá
        interview_text = ""
        for msg in messages:
            role = "Interviewer" if msg['sender'] == 'ai' else "Candidate"
            interview_text += f"{role}: {msg['content']}\n"

        prompt = f"""
        Bạn là chuyên gia phỏng vấn nhân sự cấp cao, phong thái chuyên nghiệp, phong cách đôi khi NGHIÊM KHẮC, THẲNG THẮN, và có KHOAN NHƯỢNG dựa trên câu trả lời của ứng viên. Hãy đánh giá buổi phỏng vấn cho vị trí {job_title}:

        Dưới đây là Lịch sử trò chuyện:
        {interview_text}

        Hãy đưa ra nhận xét bằng ngôn ngữ: {language}". Điều này giúp trải nghiệm người dùng đồng nhất từ đầu đến cuối.

        Hãy đánh giá Ứng viên dựa trên các tiêu chí:
        1. Điểm kỹ thuật (1-100)
        2. Điểm giao tiếp (1-100)
        3. Điểm tổng thể (1-100)
        4. Đưa ra chính xác các điểm mạnh
        5. Đưa ra chính xác các điểm cần cải thiện
        6. Lời khuyên phát triển

        BẮT BUỘC PHẢI TRẢ VỀ CHUẨN JSON VỚI ĐÚNG CÁC TRƯỜNG DỮ LIỆU SAU, KHÔNG THÊM BỚT BẤT KỲ VĂN BẢN NÀO:
        {{
            "overall_score": 85,
            "technical_score": 90,
            "communication_score": 80,
            "strengths": ["Liệt kê tất cả các điểm mạnh tìm thấy..."],
            "weaknesses": ["Liệt kê tất cả các điểm cần cải thiện tìm thấy..."],
            "advice": "Lời khuyên chi tiết..."
        }}
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