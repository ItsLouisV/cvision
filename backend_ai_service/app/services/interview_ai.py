from typing import List, Dict, Any
from app.core.gemini import gemini
from app.prompts.interview import STREAM_INTERVIEW_PROMPT
import logging


logger = logging.getLogger(__name__)


class InterviewAIService:
    async def generate_question_stream(self,
                                       job_title: str,
                                       requirements: str,
                                       cv_data: str,
                                       language: str,
                                       user_answers_count: int,
                                       history: List[Dict[str, str]]):
        """Tạo câu hỏi phỏng vấn tiếp theo dạng streaming"""
        if language == "English":
            lang_instruction = "IMPORTANT: Conduct the entire interview in ENGLISH. All questions and feedback must be in English."
        else:  # Mặc định Vietnamese
            lang_instruction = "QUAN TRỌNG: Thực hiện toàn bộ buổi phỏng vấn bằng TIẾNG VIỆT."

        # Format history
        history_text = ""
        for msg in history[-10:]:
            sender = "AI" if msg['sender'] == 'ai' else "Ứng viên"
            history_text += f"{sender}: {msg['content']}\n"

        prompt = STREAM_INTERVIEW_PROMPT.format(
            job_title=job_title,
            requirements=requirements,
            cv_data=cv_data,
            user_answers_count=user_answers_count,
            history=history_text,
            language_instruction=lang_instruction
        )

        from app.core.config import config
        
        try:
            # Fallback DeepSeek stream (Optional, we try Gemini first)
            # using google.genai async client
            response_stream = await gemini.client.aio.models.generate_content_stream(
                model=config.GEMINI_MODEL,
                contents=prompt
            )
            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Interview question streaming error: {e}")
            yield "Xin lỗi, đã xảy ra lỗi trong quá trình tạo câu hỏi. Hãy thử lại."

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
        4. Liệt kê các điểm mạnh thực tế (số lượng linh hoạt tùy theo năng lực thể hiện).
        5. Liệt kê các điểm cần cải thiện thực tế (số lượng linh hoạt, không gượng ép).
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