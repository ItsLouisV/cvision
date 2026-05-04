from typing import List, Dict, Any
from app.core.gemini import gemini
from app.prompts.interview import STREAM_INTERVIEW_PROMPT
from app.rules.scoring_rules import InterviewRules
from app.utils.ai_audit import ai_audit
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

        # ── Hard Rule: Hệ thống kiểm tra giới hạn câu TRƯỚC KHI gọi AI ──
        if user_answers_count >= InterviewRules.MAX_QUESTIONS:
            logger.warning(
                f"[InterviewRules] Đã đạt giới hạn {InterviewRules.MAX_QUESTIONS} câu. "
                f"Hệ thống tự ngắt — không gọi AI."
            )
            yield "[SYSTEM_END]"
            return

        if language == "English":
            lang_instruction = "IMPORTANT: Conduct the entire interview in ENGLISH. All questions and feedback must be in English."
        else:  # Mặc định Vietnamese
            lang_instruction = "QUAN TRỌNG: Thực hiện toàn bộ buổi phỏng vấn bằng TIẾNG VIỆT."

        # Format history (chỉ lấy 10 tin nhắn gần nhất để tránh context quá dài)
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
                                 messages: List[Dict[str, str]],
                                 session_id: str = "unknown") -> Dict[str, Any]:
        """Đánh giá toàn bộ buổi phỏng vấn"""

        # Đếm số câu ứng viên đã trả lời để áp dụng rules
        answer_count = sum(1 for m in messages if m['sender'] == 'user')

        # Tạo transcript
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
        1. Điểm kỹ thuật (1-100): Chỉ dựa trên NỘI DUNG câu trả lời, không suy đoán.
        2. Điểm giao tiếp (1-100): Dựa trên cách diễn đạt, rõ ràng, mạch lạc.
        3. Điểm tổng thể (1-100): PHẢI nằm trong khoảng ±10 so với trung bình của điểm kỹ thuật và giao tiếp.
        4. Liệt kê các điểm mạnh THỰC TẾ đã thể hiện qua câu trả lời (không suy đoán).
        5. Liệt kê các điểm cần cải thiện THỰC TẾ (không gượng ép, chỉ ghi nếu rõ ràng).
        6. Lời khuyên phát triển cụ thể và hữu ích.

        QUY TẮC BẮT BUỘC:
        - Điểm số phải từ 0-100.
        - overall_score KHÔNG được cao hơn trung bình (technical_score + communication_score)/2 quá 10 điểm.
        - Nếu ứng viên trả lời ít hơn 3 câu, overall_score KHÔNG được vượt quá 50.
        - Chỉ nhận xét những gì ứng viên THỰC SỰ đã nói — không thêm thắt.

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
            ai_raw = await gemini.generate_json(prompt)

            # ── Áp dụng Hard Rules — layer kiểm soát AI ──
            final_result = InterviewRules.validate_and_fix(ai_raw.copy(), answer_count)

            # ── Ghi Audit Log ──
            ai_audit.log(
                action="interview_evaluation",
                entity_id=session_id,
                ai_raw_output=ai_raw,
                final_output=final_result,
                was_adjusted=final_result.get("_rule_adjusted", False),
                extra={"answer_count": answer_count, "job_title": job_title}
            )

            return final_result

        except Exception as e:
            logger.error(f"Interview evaluation error: {e}")
            return {
                "overall_score": 0,
                "technical_score": 0,
                "communication_score": 0,
                "strengths": [],
                "weaknesses": [],
                "advice": "Không thể đánh giá tự động",
                "_rule_adjusted": False
            }


interview_ai = InterviewAIService()